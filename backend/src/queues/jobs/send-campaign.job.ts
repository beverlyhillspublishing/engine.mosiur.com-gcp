import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { campaignQueue } from '../queues';
import { resolveSegmentContactIds } from '../../services/segment.service';
import { logger } from '../../utils/logger';

const BATCH_SIZE = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function processSendCampaign(job: Job) {
  const { campaignId, orgId } = job.data as { campaignId: string; orgId: string };

  logger.info({ campaignId }, 'Starting campaign send');

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      lists: { include: { list: { include: { contacts: { include: { contact: true } } } } } },
      segments: true,
      abTest: true,
    },
  });

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  if (campaign.status !== 'SENDING' && campaign.status !== 'SCHEDULED') {
    logger.warn({ campaignId, status: campaign.status }, 'Campaign not in sendable state');
    return;
  }

  // 1. Resolve audience from lists
  const contactMap = new Map<string, { id: string; email: string }>();
  for (const cl of campaign.lists) {
    for (const lc of cl.list.contacts) {
      if (lc.contact.status === 'SUBSCRIBED') {
        contactMap.set(lc.contact.id, { id: lc.contact.id, email: lc.contact.email });
      }
    }
  }

  // 2. Add segment contacts
  for (const cs of campaign.segments) {
    const ids = await resolveSegmentContactIds(orgId, cs.segmentId);
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids }, organizationId: orgId, status: 'SUBSCRIBED' },
      select: { id: true, email: true },
    });
    for (const c of contacts) contactMap.set(c.id, c);
  }

  // 3. Subtract suppression list
  const suppressedEmails = await prisma.suppressionEntry.findMany({
    where: { organizationId: orgId },
    select: { email: true },
  });
  const suppressedSet = new Set(suppressedEmails.map((s) => s.email.toLowerCase()));

  const audience = [...contactMap.values()].filter(
    (c) => !suppressedSet.has(c.email.toLowerCase()),
  );

  if (audience.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'SENT', sentAt: new Date() } });
    logger.info({ campaignId }, 'Campaign sent to 0 contacts (empty audience after suppression)');
    return;
  }

  // 4. Check monthly limit
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error('Organization not found');

  const remaining = org.monthlyEmailLimit - org.emailsSentThisMonth;
  if (remaining <= 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
    throw new Error(`Monthly email limit reached for org ${orgId}`);
  }

  const sendableAudience = audience.slice(0, remaining);

  // 5. Handle A/B test split
  let variantA = sendableAudience;
  let variantB: typeof sendableAudience = [];
  let holdback: typeof sendableAudience = [];

  if (campaign.abTest) {
    const shuffled = [...sendableAudience].sort(() => Math.random() - 0.5);
    const splitCount = Math.floor(shuffled.length * (campaign.abTest.splitPercent / 100));
    variantA = shuffled.slice(0, splitCount);
    variantB = shuffled.slice(splitCount, splitCount * 2);
    holdback = shuffled.slice(splitCount * 2);
  }

  // 6. Create EmailSend records in bulk and enqueue batches
  const createSends = async (contacts: typeof sendableAudience, variant?: string) => {
    const sends = await prisma.$transaction(
      contacts.map((c) =>
        prisma.emailSend.create({
          data: { campaignId, contactId: c.id, email: c.email, variant },
        }),
      ),
    );
    return sends;
  };

  const [sendsA] = await Promise.all([
    createSends(variantA, campaign.abTest ? 'A' : undefined),
    variantB.length > 0 ? createSends(variantB, 'B') : Promise.resolve([]),
  ]);

  // Enqueue batch jobs
  const enqueueBatches = async (sends: typeof sendsA, variant?: string) => {
    const batches = chunk(sends, BATCH_SIZE);
    for (const batch of batches) {
      await campaignQueue.add('send-email-batch', {
        campaignId,
        orgId,
        sendIds: batch.map((s) => s.id),
        variant,
      });
    }
  };

  await enqueueBatches(sendsA);

  // If A/B test, also schedule winner-pick job
  if (campaign.abTest && holdback.length > 0) {
    const delayMs = campaign.abTest.testDurationHours * 60 * 60 * 1000;
    const { abTestQueue } = await import('../queues');
    await abTestQueue.add(
      'abtest-select-winner',
      { campaignId, orgId, holdbackContactIds: holdback.map((c) => c.id) },
      { delay: delayMs },
    );
  }

  // 7. Update campaign status and email count
  await Promise.all([
    prisma.campaign.update({ where: { id: campaignId }, data: { status: 'SENDING', sentAt: new Date() } }),
    prisma.organization.update({
      where: { id: orgId },
      data: { emailsSentThisMonth: { increment: sendableAudience.length } },
    }),
  ]);

  logger.info({ campaignId, totalContacts: sendableAudience.length }, 'Campaign batches enqueued');
}

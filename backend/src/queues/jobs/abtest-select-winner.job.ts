import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { campaignQueue } from '../queues';
import { logger } from '../../utils/logger';

export async function processAbTestSelectWinner(job: Job) {
  const { campaignId, orgId, holdbackContactIds } = job.data as {
    campaignId: string;
    orgId: string;
    holdbackContactIds: string[];
  };

  const abTest = await prisma.abTest.findUnique({ where: { campaignId } });
  if (!abTest || abTest.winnerVariant) return; // Already decided

  // Count opens/clicks per variant
  const [aStats, bStats] = await Promise.all([
    prisma.emailSend.aggregate({
      where: { campaignId, variant: 'A' },
      _count: { id: true },
      _sum: { openCount: true, clickCount: true },
    }),
    prisma.emailSend.aggregate({
      where: { campaignId, variant: 'B' },
      _count: { id: true },
      _sum: { openCount: true, clickCount: true },
    }),
  ]);

  const aTotal = aStats._count.id || 1;
  const bTotal = bStats._count.id || 1;

  let winner: 'A' | 'B';
  if (abTest.winnerMetric === 'OPEN_RATE') {
    const aRate = (aStats._sum.openCount || 0) / aTotal;
    const bRate = (bStats._sum.openCount || 0) / bTotal;
    winner = aRate >= bRate ? 'A' : 'B';
  } else {
    const aRate = (aStats._sum.clickCount || 0) / aTotal;
    const bRate = (bStats._sum.clickCount || 0) / bTotal;
    winner = aRate >= bRate ? 'A' : 'B';
  }

  await prisma.abTest.update({
    where: { campaignId },
    data: { winnerVariant: winner, winnerPickedAt: new Date() },
  });

  logger.info({ campaignId, winner }, 'A/B test winner selected');

  // Send winning variant to holdback audience
  if (holdbackContactIds.length > 0) {
    // Create EmailSend records for holdback
    await prisma.emailSend.createMany({
      data: holdbackContactIds.map((contactId) => ({
        campaignId,
        contactId,
        email: '', // Will be filled by batch job — we need contacts
        variant: winner,
        status: 'QUEUED',
      })),
      skipDuplicates: true,
    });

    // Enqueue batch
    const sends = await prisma.emailSend.findMany({
      where: { campaignId, variant: winner, contactId: { in: holdbackContactIds } },
    });

    await campaignQueue.add('send-email-batch', {
      campaignId,
      orgId,
      sendIds: sends.map((s) => s.id),
      variant: winner,
    });
  }
}

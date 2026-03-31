import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { campaignQueue } from '../queues/queues';
import { getPaginationParams, paginatedResponse } from '../utils/pagination';
import { CampaignStatus } from '@prisma/client';

export async function listCampaigns(orgId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const status = query.status as CampaignStatus | undefined;

  const where = { organizationId: orgId, ...(status && { status }) };
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sends: true } },
        lists: { include: { list: { select: { id: true, name: true } } } },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  return paginatedResponse(campaigns, total, page, limit);
}

export async function createCampaign(orgId: string, data: {
  name: string;
  subject: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  senderProfileId?: string;
  listIds?: string[];
  segmentIds?: string[];
}) {
  const { listIds, segmentIds, ...campaignData } = data;

  return prisma.campaign.create({
    data: {
      ...campaignData,
      organizationId: orgId,
      lists: listIds ? { create: listIds.map((listId) => ({ listId })) } : undefined,
      segments: segmentIds ? { create: segmentIds.map((segmentId) => ({ segmentId })) } : undefined,
    },
    include: { lists: true, segments: true },
  });
}

export async function getCampaign(orgId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: {
      lists: { include: { list: true } },
      segments: { include: { segment: true } },
      abTest: true,
      template: { select: { id: true, name: true } },
    },
  });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  return campaign;
}

export async function updateCampaign(orgId: string, id: string, data: Partial<{
  name: string; subject: string; previewText: string; fromName: string; fromEmail: string;
  replyToEmail: string; htmlContent: string; textContent: string; designJson: unknown;
  templateId: string; senderProfileId: string; scheduledAt: Date;
  listIds: string[]; segmentIds: string[];
}>) {
  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  if (campaign.status === 'SENT') throw new AppError(400, 'Cannot edit a sent campaign');

  const { listIds, segmentIds, ...campaignData } = data;

  return prisma.$transaction(async (tx) => {
    if (listIds !== undefined) {
      await tx.campaignList.deleteMany({ where: { campaignId: id } });
      await tx.campaignList.createMany({ data: listIds.map((listId) => ({ campaignId: id, listId })) });
    }
    if (segmentIds !== undefined) {
      await tx.campaignSegment.deleteMany({ where: { campaignId: id } });
      await tx.campaignSegment.createMany({ data: segmentIds.map((segmentId) => ({ campaignId: id, segmentId })) });
    }
    return tx.campaign.update({ where: { id }, data: campaignData });
  });
}

export async function deleteCampaign(orgId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  if (campaign.status === 'SENDING') throw new AppError(400, 'Cannot delete a campaign that is sending');
  await prisma.campaign.delete({ where: { id } });
}

export async function sendCampaign(orgId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
    throw new AppError(400, 'Campaign cannot be sent in its current state');
  }
  if (!campaign.htmlContent) throw new AppError(400, 'Campaign has no email content');

  await prisma.campaign.update({ where: { id }, data: { status: 'SENDING' } });
  await campaignQueue.add('send-campaign', { campaignId: id, orgId }, { priority: 1 });

  return { message: 'Campaign send initiated' };
}

export async function scheduleCampaign(orgId: string, id: string, scheduledAt: Date) {
  if (scheduledAt <= new Date()) throw new AppError(400, 'Scheduled time must be in the future');

  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  if (campaign.status !== 'DRAFT') throw new AppError(400, 'Only draft campaigns can be scheduled');

  await prisma.campaign.update({ where: { id }, data: { status: 'SCHEDULED', scheduledAt } });

  const delayMs = scheduledAt.getTime() - Date.now();
  await campaignQueue.add('send-campaign', { campaignId: id, orgId }, { delay: delayMs });

  return { message: 'Campaign scheduled' };
}

export async function getCampaignStats(orgId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) throw new AppError(404, 'Campaign not found');

  const [total, delivered, opened, clicked, bounced, unsubscribed] = await Promise.all([
    prisma.emailSend.count({ where: { campaignId: id } }),
    prisma.emailSend.count({ where: { campaignId: id, status: { in: ['DELIVERED', 'OPENED', 'CLICKED'] } } }),
    prisma.emailSend.count({ where: { campaignId: id, openedAt: { not: null } } }),
    prisma.emailSend.count({ where: { campaignId: id, clickCount: { gt: 0 } } }),
    prisma.emailSend.count({ where: { campaignId: id, bouncedAt: { not: null } } }),
    prisma.emailSend.count({ where: { campaignId: id, unsubscribedAt: { not: null } } }),
  ]);

  return {
    total,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    openRate: total > 0 ? ((opened / total) * 100).toFixed(2) : '0.00',
    clickRate: total > 0 ? ((clicked / total) * 100).toFixed(2) : '0.00',
    bounceRate: total > 0 ? ((bounced / total) * 100).toFixed(2) : '0.00',
    unsubscribeRate: total > 0 ? ((unsubscribed / total) * 100).toFixed(2) : '0.00',
  };
}

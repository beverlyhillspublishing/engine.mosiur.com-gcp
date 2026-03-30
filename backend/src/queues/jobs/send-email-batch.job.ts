import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { campaignQueue } from '../queues';
import { buildEmailContext, renderEmailHtml, renderEmailText } from '../../utils/email-renderer';
import { rewriteLinks } from '../../utils/link-rewriter';
import { logger } from '../../utils/logger';

export async function processSendEmailBatch(job: Job) {
  const { campaignId, orgId, sendIds, variant } = job.data as {
    campaignId: string;
    orgId: string;
    sendIds: string[];
    variant?: string;
  };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      organization: true,
      abTest: true,
      senderProfile: true,
    } as never,
  });

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Select HTML based on variant
  let html = campaign.htmlContent || '';
  let subject = campaign.subject;

  if (variant === 'B' && campaign.abTest) {
    if (campaign.abTest.variantBHtml) html = campaign.abTest.variantBHtml;
    if (campaign.abTest.variantBSubject) subject = campaign.abTest.variantBSubject;
  }

  const sends = await prisma.emailSend.findMany({
    where: { id: { in: sendIds } },
    include: { contact: true } as never,
  });

  for (const send of sends as (typeof sends[0] & { contact: { id: string; email: string; firstName: string | null; lastName: string | null } })[]) {
    try {
      // Build per-contact context
      const context = buildEmailContext(
        send.contact,
        (campaign as unknown as { organization: { name: string } }).organization.name,
        orgId,
      );

      // Render merge tags
      const renderedHtml = renderEmailHtml(html, context);
      const renderedText = campaign.textContent
        ? renderEmailText(campaign.textContent, context)
        : undefined;

      // Rewrite links to tracking URLs
      const trackedHtml = await rewriteLinks(renderedHtml, campaignId, send.id);

      // Inject open-tracking pixel
      const { config } = await import('../../config');
      const pixelHtml = `${trackedHtml}<img src="${config.apiUrl}/t/o/${send.id}" width="1" height="1" alt="" style="display:none" />`;

      // Enqueue single send job
      await campaignQueue.add('send-single-email', {
        sendId: send.id,
        to: send.email,
        subject,
        html: pixelHtml,
        text: renderedText,
        fromEmail: campaign.fromEmail,
        fromName: campaign.fromName,
        replyToEmail: campaign.replyToEmail,
        senderProfileId: campaign.senderProfileId,
        orgId,
      });

      await prisma.emailSend.update({ where: { id: send.id }, data: { status: 'SENDING' } });
    } catch (err) {
      logger.error({ err, sendId: send.id }, 'Error rendering email for batch');
    }
  }
}

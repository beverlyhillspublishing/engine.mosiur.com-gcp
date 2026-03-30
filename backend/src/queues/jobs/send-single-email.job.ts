import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { getEmailProvider } from '../../email-providers';
import { SmtpProvider } from '../../email-providers/smtp.provider';
import { encrypt } from '../../utils/hash';
import { config as appConfig } from '../../config';
import { logger } from '../../utils/logger';
import { EventType } from '@prisma/client';

export async function processSendSingleEmail(job: Job) {
  const { sendId, to, subject, html, text, fromEmail, fromName, replyToEmail, senderProfileId, orgId } =
    job.data as {
      sendId: string;
      to: string;
      subject: string;
      html: string;
      text?: string;
      fromEmail: string;
      fromName: string;
      replyToEmail?: string;
      senderProfileId?: string;
      orgId: string;
    };

  let provider;

  if (senderProfileId) {
    const senderProfile = await prisma.senderProfile.findFirst({
      where: { id: senderProfileId, organizationId: orgId },
    });
    if (!senderProfile) throw new Error(`SenderProfile ${senderProfileId} not found`);
    provider = getEmailProvider(senderProfile.provider, senderProfile.encryptedConfig);
  } else {
    // Fallback to system SMTP
    const systemConfig = {
      host: appConfig.smtp.host,
      port: appConfig.smtp.port,
      user: appConfig.smtp.user,
      pass: appConfig.smtp.pass,
    };
    // Encrypt for provider constructor
    provider = new SmtpProvider(systemConfig);
  }

  const result = await provider.send({
    to,
    subject,
    html,
    text,
    fromEmail,
    fromName,
    replyTo: replyToEmail,
  });

  if (result.success) {
    await prisma.emailSend.update({
      where: { id: sendId },
      data: {
        status: 'DELIVERED',
        messageId: result.messageId,
        sentAt: new Date(),
        events: { create: { type: EventType.SENT, occurredAt: new Date() } },
      },
    });
    logger.debug({ sendId, to }, 'Email sent successfully');
  } else {
    await prisma.emailSend.update({
      where: { id: sendId },
      data: {
        status: 'FAILED',
        events: { create: { type: EventType.SENT, metadata: { error: result.error }, occurredAt: new Date() } },
      },
    });
    logger.error({ sendId, to, error: result.error }, 'Email send failed');
    throw new Error(`Send failed: ${result.error}`);
  }
}

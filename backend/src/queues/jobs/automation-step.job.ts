import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { automationQueue, campaignQueue } from '../queues';
import { buildEmailContext, renderEmailHtml, renderEmailText } from '../../utils/email-renderer';
import { rewriteLinks } from '../../utils/link-rewriter';
import { logger } from '../../utils/logger';
import { addDays, addHours, addMinutes } from '../../utils/date';

export async function processAutomationStep(job: Job) {
  const { enrollmentId, stepId } = job.data as { enrollmentId: string; stepId: string };

  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      automation: { include: { organization: true } },
      contact: true,
    },
  });

  if (!enrollment || enrollment.status !== 'ACTIVE') return;

  const step = await prisma.automationStep.findUnique({ where: { id: stepId } });
  if (!step) return;

  const config = step.config as Record<string, unknown>;
  const org = (enrollment.automation as unknown as { organization: { id: string; name: string } }).organization;

  switch (step.stepType) {
    case 'SEND_EMAIL': {
      const context = buildEmailContext(enrollment.contact, org.name, org.id);
      const html = renderEmailHtml(String(config.htmlContent || ''), context);
      const text = config.textContent ? renderEmailText(String(config.textContent), context) : undefined;
      const trackedHtml = await rewriteLinks(html, '', '');
      const { config: appConfig } = await import('../../config');
      const pixelUrl = `${appConfig.apiUrl}/t/o/`;

      const send = await prisma.emailSend.create({
        data: {
          contactId: enrollment.contactId,
          email: enrollment.contact.email,
          automationStepId: stepId,
          status: 'QUEUED',
        },
      });

      await campaignQueue.add('send-single-email', {
        sendId: send.id,
        to: enrollment.contact.email,
        subject: String(config.subject || ''),
        html: `${trackedHtml}<img src="${pixelUrl}${send.id}" width="1" height="1" alt="" style="display:none"/>`,
        text,
        fromEmail: String(config.fromEmail || appConfig.smtp.fromEmail),
        fromName: String(config.fromName || org.name),
        orgId: org.id,
      });
      break;
    }

    case 'WAIT_DELAY': {
      const amount = Number(config.amount || 1);
      const unit = String(config.unit || 'days');
      let nextRunAt: Date;
      if (unit === 'minutes') nextRunAt = addMinutes(new Date(), amount);
      else if (unit === 'hours') nextRunAt = addHours(new Date(), amount);
      else nextRunAt = addDays(new Date(), amount);

      // Update enrollment to next step, re-enqueue with delay
      const nextStep = await prisma.automationStep.findFirst({
        where: { automationId: enrollment.automationId, stepOrder: { gt: step.stepOrder } },
        orderBy: { stepOrder: 'asc' },
      });

      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStepId: nextStep?.id, nextRunAt },
      });

      if (nextStep) {
        const delayMs = nextRunAt.getTime() - Date.now();
        await automationQueue.add('automation-step', { enrollmentId, stepId: nextStep.id }, { delay: Math.max(0, delayMs) });
      } else {
        await prisma.automationEnrollment.update({ where: { id: enrollmentId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      }
      return;
    }

    case 'ADD_TAG': {
      await prisma.contact.update({
        where: { id: enrollment.contactId },
        data: { tags: { push: String(config.tag) } },
      });
      break;
    }

    case 'REMOVE_TAG': {
      const contact = await prisma.contact.findUnique({ where: { id: enrollment.contactId } });
      if (contact) {
        await prisma.contact.update({
          where: { id: enrollment.contactId },
          data: { tags: contact.tags.filter((t: string) => t !== String(config.tag)) },
        });
      }
      break;
    }

    case 'UPDATE_FIELD': {
      const field = String(config.field);
      const value = config.value;
      const standardFields = ['firstName', 'lastName', 'phone'];
      if (standardFields.includes(field)) {
        await prisma.contact.update({ where: { id: enrollment.contactId }, data: { [field]: value } });
      } else {
        const contact = await prisma.contact.findUnique({ where: { id: enrollment.contactId } });
        if (contact) {
          const customData = (contact.customData as Record<string, unknown>) || {};
          customData[field] = value;
          await prisma.contact.update({ where: { id: enrollment.contactId }, data: { customData } });
        }
      }
      break;
    }

    default:
      logger.warn({ stepType: step.stepType }, 'Unknown automation step type');
  }

  // Advance to next step
  const nextStep = await prisma.automationStep.findFirst({
    where: { automationId: enrollment.automationId, stepOrder: { gt: step.stepOrder } },
    orderBy: { stepOrder: 'asc' },
  });

  if (nextStep) {
    await prisma.automationEnrollment.update({ where: { id: enrollmentId }, data: { currentStepId: nextStep.id } });
    await automationQueue.add('automation-step', { enrollmentId, stepId: nextStep.id });
  } else {
    await prisma.automationEnrollment.update({ where: { id: enrollmentId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    logger.info({ enrollmentId }, 'Automation enrollment completed');
  }
}

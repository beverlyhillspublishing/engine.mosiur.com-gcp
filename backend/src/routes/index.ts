import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import orgRoutes from './org.routes';
import contactRoutes from './contacts.routes';
import listRoutes from './lists.routes';
import segmentRoutes from './segments.routes';
import campaignRoutes from './campaigns.routes';
import templateRoutes from './templates.routes';
import analyticsRoutes from './analytics.routes';
import billingRoutes from './billing.routes';
import senderRoutes from './senders.routes';
import automationRoutes from './automations.routes';
import apiKeyRoutes from './apikeys.routes';
import webhookRoutes from './webhooks.routes';
import trackingRoutes from './tracking.routes';
import unsubscribeRoutes from './unsubscribe.routes';
import driveRoutes from './drive.routes';
import aiBuilderRoutes from './ai-builder.routes';
import * as inboundEmailService from '../services/inbound-email.service';
import notesRoutes from './notes.routes';
import remindersRoutes from './reminders.routes';
import calendarRoutes from './calendar.routes';
import docsRoutes from './docs.routes';
import mailRoutes from './mail.routes';
import { authenticate } from '../middleware/auth';
import { loadOrganization } from '../middleware/tenancy';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
router.use('/auth', authRoutes);
router.use('/t', trackingRoutes);
router.use('/unsub', unsubscribeRoutes);
router.post('/billing/stripe-webhook', billingRoutes);

// Inbound email webhook (public, HMAC-verified internally)
router.post('/ai/inbox/receive', async (req, res, next) => {
  try {
    const body = req.body as Record<string, string>;
    if (body['body-mime']) {
      // Mailgun
      const { timestamp, token, signature } = body;
      if (timestamp && !inboundEmailService.verifyMailgunSignature(timestamp, token, signature)) {
        return res.status(403).json({ error: 'Invalid signature' });
      }
      await inboundEmailService.receiveEmail(body['body-mime'], body.recipient);
    } else if (body.html || body.text) {
      await inboundEmailService.receiveEmail(body, body.to);
    } else if (body.message) {
      await inboundEmailService.receiveEmail(body.message, body.to);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Authenticated routes
router.use('/auth', authRoutes);

// Org-scoped routes
const orgRouter = Router({ mergeParams: true });
orgRouter.use(authenticate, loadOrganization);
orgRouter.use('/contacts', contactRoutes);
orgRouter.use('/lists', listRoutes);
orgRouter.use('/segments', segmentRoutes);
orgRouter.use('/campaigns', campaignRoutes);
orgRouter.use('/templates', templateRoutes);
orgRouter.use('/analytics', analyticsRoutes);
orgRouter.use('/billing', billingRoutes);
orgRouter.use('/senders', senderRoutes);
orgRouter.use('/automations', automationRoutes);
orgRouter.use('/api-keys', apiKeyRoutes);
orgRouter.use('/webhooks', webhookRoutes);
orgRouter.use('/drive', driveRoutes);
orgRouter.use('/ai', aiBuilderRoutes);
orgRouter.use('/notes', notesRoutes);
orgRouter.use('/reminders', remindersRoutes);
orgRouter.use('/calendar', calendarRoutes);
orgRouter.use('/docs', docsRoutes);
orgRouter.use('/mail', mailRoutes);

router.use('/orgs/:orgId', orgRouter);

export default router;

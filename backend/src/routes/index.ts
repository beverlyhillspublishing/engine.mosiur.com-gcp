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

router.use('/orgs/:orgId', orgRouter);

export default router;

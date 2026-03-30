import { Router } from 'express';
import * as ctrl from '../controllers/billing.controller';
import express from 'express';

const router = Router({ mergeParams: true });

// Stripe webhook needs raw body — mounted at root level with raw middleware
export const stripeWebhookRouter = Router();
stripeWebhookRouter.post('/billing/stripe-webhook', express.raw({ type: 'application/json' }), ctrl.stripeWebhook);

router.get('/plans', ctrl.plans);
router.post('/checkout', ctrl.checkout);
router.post('/portal', ctrl.portal);
router.get('/usage', ctrl.usage);

export default router;

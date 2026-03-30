import { Request, Response, NextFunction } from 'express';
import * as service from '../services/billing.service';
import { config } from '../config';

export const plans = async (_req: Request, res: Response) => {
  res.json([
    { id: 'starter', name: 'Starter', price: 9, emailsPerMonth: 1000, features: ['1,000 emails/mo', 'Basic analytics', 'Email support'] },
    { id: 'growth', name: 'Growth', price: 29, emailsPerMonth: 25000, features: ['25,000 emails/mo', 'Advanced analytics', 'A/B testing', 'Automations', 'Priority support'] },
    { id: 'pro', name: 'Pro', price: 79, emailsPerMonth: 250000, features: ['250,000 emails/mo', 'All features', 'API access', 'Webhooks', 'Dedicated support'] },
  ]);
};

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.createCheckoutSession(req.org!.id, req.body.planId, req.user!.id)); } catch (e) { next(e); }
};

export const portal = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.createPortalSession(req.org!.id)); } catch (e) { next(e); }
};

export const usage = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getUsage(req.org!.id)); } catch (e) { next(e); }
};

export const stripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    await service.handleStripeWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (e) { next(e); }
};

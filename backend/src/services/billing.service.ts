import { stripe } from '../config/stripe';
import { prisma } from '../config/database';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const PLAN_PRICE_MAP: Record<string, string> = {
  starter: config.stripe.prices.starter,
  growth: config.stripe.prices.growth,
  pro: config.stripe.prices.pro,
};

export async function createCheckoutSession(orgId: string, planId: string, userId: string) {
  if (!PLAN_PRICE_MAP[planId]) throw new AppError(400, 'Invalid plan');

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, 'Organization not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: org.name, metadata: { orgId } });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLAN_PRICE_MAP[planId], quantity: 1 }],
    success_url: `${config.appUrl}/settings/billing?success=1`,
    cancel_url: `${config.appUrl}/settings/billing?canceled=1`,
    metadata: { orgId, planId },
  });

  return { url: session.url };
}

export async function createPortalSession(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.stripeCustomerId) throw new AppError(400, 'No active subscription');

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${config.appUrl}/settings/billing`,
  });

  return { url: session.url };
}

export async function handleStripeWebhook(rawBody: Buffer, sig: string) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, config.stripe.webhookSecret);
  } catch {
    throw new AppError(400, 'Invalid Stripe webhook signature');
  }

  const PLAN_LIMIT_MAP: Record<string, number> = {
    starter: 1000,
    growth: 25000,
    pro: 250000,
  };

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as { id: string; status: string; customer: string; metadata?: { planId?: string } };
      const org = await prisma.organization.findFirst({ where: { stripeCustomerId: String(sub.customer) } });
      if (org) {
        const planId = (sub.metadata as Record<string, string>)?.planId || org.planId;
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            planId,
            monthlyEmailLimit: PLAN_LIMIT_MAP[planId] || 1000,
          },
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { customer: string };
      const org = await prisma.organization.findFirst({ where: { stripeCustomerId: String(sub.customer) } });
      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { subscriptionStatus: 'canceled', stripeSubscriptionId: null, planId: 'starter', monthlyEmailLimit: 1000 },
        });
      }
      break;
    }
  }
}

export async function getUsage(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, 'Organization not found');
  return {
    emailsSentThisMonth: org.emailsSentThisMonth,
    monthlyEmailLimit: org.monthlyEmailLimit,
    planId: org.planId,
    subscriptionStatus: org.subscriptionStatus,
    usagePercent: Math.floor((org.emailsSentThisMonth / org.monthlyEmailLimit) * 100),
  };
}

import { Job } from 'bullmq';
import { createHmac } from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export async function processWebhookDispatch(job: Job) {
  const { endpointId, event, payload, deliveryId } = job.data as {
    endpointId: string;
    event: string;
    payload: Record<string, unknown>;
    deliveryId: string;
  };

  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint || !endpoint.isActive) return;

  const body = JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() });
  const sig = createHmac('sha256', endpoint.secret).update(body).digest('hex');

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let delivered = false;

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TechyPark-Signature': `sha256=${sig}`,
        'X-TechyPark-Event': event,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    responseStatus = response.status;
    responseBody = await response.text();
    delivered = response.ok;
  } catch (err) {
    logger.error({ err, endpointId, event }, 'Webhook delivery failed');
  }

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      responseStatus,
      responseBody: responseBody?.slice(0, 1000),
      attemptCount: { increment: 1 },
      deliveredAt: delivered ? new Date() : undefined,
    },
  });

  if (!delivered) {
    const attemptCount = (job.attemptsMade || 0) + 1;
    if (attemptCount < 5) {
      throw new Error(`Webhook delivery failed with status ${responseStatus}`);
    }
    logger.warn({ endpointId, event }, 'Webhook delivery exhausted retries');
  }
}

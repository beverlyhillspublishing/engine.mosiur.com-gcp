import { Queue } from 'bullmq';
import { bullRedisConnection } from '../config/redis';

export const campaignQueue = new Queue('email-campaigns', { connection: bullRedisConnection });
export const importQueue = new Queue('contact-imports', { connection: bullRedisConnection });
export const automationQueue = new Queue('automations', { connection: bullRedisConnection });
export const abTestQueue = new Queue('ab-tests', { connection: bullRedisConnection });
export const webhookQueue = new Queue('webhooks', { connection: bullRedisConnection });

export const allQueues = [campaignQueue, importQueue, automationQueue, abTestQueue, webhookQueue];

import { Worker } from 'bullmq';
import { bullRedisConnection } from '../config/redis';
import { processSendCampaign } from './jobs/send-campaign.job';
import { processSendEmailBatch } from './jobs/send-email-batch.job';
import { processSendSingleEmail } from './jobs/send-single-email.job';
import { processCsvImport } from './jobs/process-csv-import.job';
import { processAutomationStep } from './jobs/automation-step.job';
import { processAbTestSelectWinner } from './jobs/abtest-select-winner.job';
import { processWebhookDispatch } from './jobs/webhook-dispatch.job';
import { logger } from '../utils/logger';

let workers: Worker[] = [];

export function startWorkers(): void {
  const campaignWorker = new Worker(
    'email-campaigns',
    async (job) => {
      if (job.name === 'send-campaign') return processSendCampaign(job);
      if (job.name === 'send-email-batch') return processSendEmailBatch(job);
      if (job.name === 'send-single-email') return processSendSingleEmail(job);
    },
    {
      connection: bullRedisConnection,
      concurrency: 10,
      limiter: { max: 50, duration: 1000 }, // 50 emails/sec max
    },
  );

  const importWorker = new Worker('contact-imports', processCsvImport, {
    connection: bullRedisConnection,
    concurrency: 2,
  });

  const automationWorker = new Worker('automations', processAutomationStep, {
    connection: bullRedisConnection,
    concurrency: 5,
  });

  const abTestWorker = new Worker('ab-tests', processAbTestSelectWinner, {
    connection: bullRedisConnection,
    concurrency: 2,
  });

  const webhookWorker = new Worker('webhooks', processWebhookDispatch, {
    connection: bullRedisConnection,
    concurrency: 10,
    limiter: { max: 100, duration: 1000 },
  });

  workers = [campaignWorker, importWorker, automationWorker, abTestWorker, webhookWorker];

  for (const worker of workers) {
    worker.on('completed', (job) => {
      logger.debug({ jobId: job.id, queue: job.queueName }, 'Job completed');
    });
    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, queue: job?.queueName, err }, 'Job failed');
    });
  }

  logger.info('All BullMQ workers started');
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  logger.info('All BullMQ workers stopped');
}

import { Job } from 'bullmq';
import { syncAccount } from '../../services/mail.service';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export async function processSyncMailAccount(job: Job<{ accountId?: string }>) {
  const { accountId } = job.data;

  if (accountId) {
    logger.info({ accountId }, 'Starting mail sync');
    await syncAccount(accountId);
    logger.info({ accountId }, 'Mail sync complete');
  } else {
    // Periodic: sync all active accounts
    const accounts = await prisma.mailAccount.findMany({
      where: { syncStatus: { not: 'syncing' } },
      select: { id: true },
    });
    logger.info({ count: accounts.length }, 'Periodic mail sync: syncing all accounts');
    for (const account of accounts) {
      await syncAccount(account.id);
    }
  }
}

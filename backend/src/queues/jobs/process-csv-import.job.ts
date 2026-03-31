import { Job } from 'bullmq';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { prisma } from '../../config/database';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';

interface ColumnMapping {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string;
  [key: string]: string | undefined;
}

export async function processCsvImport(job: Job) {
  const { orgId, csvData, columnMapping, listId, jobId } = job.data as {
    orgId: string;
    csvData: string;
    columnMapping: ColumnMapping;
    listId?: string;
    jobId: string;
  };

  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  const statusKey = `import:${jobId}`;
  await redisClient.set(statusKey, JSON.stringify({ status: 'running', processed: 0 }), 'EX', 3600);

  const records: Record<string, string>[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.from([csvData]);
    stream
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (record: Record<string, string>) => records.push(record))
      .on('end', resolve)
      .on('error', reject);
  });

  for (const row of records) {
    try {
      const email = row[columnMapping.email]?.trim().toLowerCase();
      if (!email) { errors++; continue; }

      const data: Record<string, unknown> = { email, organizationId: orgId };
      if (columnMapping.firstName && row[columnMapping.firstName]) data.firstName = row[columnMapping.firstName];
      if (columnMapping.lastName && row[columnMapping.lastName]) data.lastName = row[columnMapping.lastName];
      if (columnMapping.phone && row[columnMapping.phone]) data.phone = row[columnMapping.phone];
      if (columnMapping.tags && row[columnMapping.tags]) {
        data.tags = row[columnMapping.tags].split(',').map((t: string) => t.trim()).filter(Boolean);
      }

      const existing = await prisma.contact.findUnique({
        where: { email_organizationId: { email, organizationId: orgId } },
      });

      if (existing) {
        await prisma.contact.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        const contact = await prisma.contact.create({ data: data as Parameters<typeof prisma.contact.create>[0]['data'] });
        if (listId) {
          await prisma.listContact.upsert({
            where: { listId_contactId: { listId, contactId: contact.id } },
            create: { listId, contactId: contact.id },
            update: {},
          });
        }
        created++;
      }
    } catch (err) {
      logger.error({ err, row }, 'Error importing contact row');
      errors++;
    }

    processed++;
    if (processed % 100 === 0) {
      await redisClient.set(statusKey, JSON.stringify({ status: 'running', processed, total: records.length }), 'EX', 3600);
      await job.updateProgress(Math.floor((processed / records.length) * 100));
    }
  }

  const summary = { status: 'done', processed, created, updated, errors, total: records.length };
  await redisClient.set(statusKey, JSON.stringify(summary), 'EX', 3600);
  logger.info({ orgId, ...summary }, 'CSV import completed');
  return summary;
}

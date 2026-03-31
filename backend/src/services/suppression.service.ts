import { prisma } from '../config/database';
import { SuppressionReason } from '@prisma/client';

export async function addToSuppression(orgId: string, email: string, reason: SuppressionReason) {
  await prisma.suppressionEntry.upsert({
    where: { email_organizationId: { email: email.toLowerCase(), organizationId: orgId } },
    create: { email: email.toLowerCase(), reason, organizationId: orgId },
    update: { reason },
  });
}

export async function isEmailSuppressed(orgId: string, email: string): Promise<boolean> {
  const entry = await prisma.suppressionEntry.findUnique({
    where: { email_organizationId: { email: email.toLowerCase(), organizationId: orgId } },
  });
  return !!entry;
}

export async function listSuppression(orgId: string) {
  return prisma.suppressionEntry.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function removeSuppression(orgId: string, id: string) {
  await prisma.suppressionEntry.deleteMany({ where: { id, organizationId: orgId } });
}

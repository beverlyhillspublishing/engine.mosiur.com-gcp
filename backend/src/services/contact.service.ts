import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPaginationParams, paginatedResponse } from '../utils/pagination';
import { ContactStatus } from '@prisma/client';

export async function listContacts(orgId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const search = String(query.search || '');
  const status = query.status as ContactStatus | undefined;

  const where = {
    organizationId: orgId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.contact.count({ where }),
  ]);

  return paginatedResponse(contacts, total, page, limit);
}

export async function createContact(orgId: string, data: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
  source?: string;
}) {
  const existing = await prisma.contact.findUnique({
    where: { email_organizationId: { email: data.email, organizationId: orgId } },
  });
  if (existing) throw new AppError(409, 'Contact with this email already exists');

  return prisma.contact.create({
    data: { ...data, organizationId: orgId, customData: data.customData || {} },
  });
}

export async function getContact(orgId: string, id: string) {
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      listMemberships: { include: { list: { select: { id: true, name: true } } } },
      events: { orderBy: { occurredAt: 'desc' }, take: 50 },
    },
  });
  if (!contact) throw new AppError(404, 'Contact not found');
  return contact;
}

export async function updateContact(orgId: string, id: string, data: Partial<{
  firstName: string;
  lastName: string;
  phone: string;
  tags: string[];
  customData: Record<string, unknown>;
  status: ContactStatus;
}>) {
  const contact = await prisma.contact.findFirst({ where: { id, organizationId: orgId } });
  if (!contact) throw new AppError(404, 'Contact not found');

  return prisma.contact.update({ where: { id }, data });
}

export async function deleteContact(orgId: string, id: string) {
  const contact = await prisma.contact.findFirst({ where: { id, organizationId: orgId } });
  if (!contact) throw new AppError(404, 'Contact not found');
  await prisma.contact.delete({ where: { id } });
}

export async function getContactStats(orgId: string) {
  const [total, subscribed, unsubscribed, bounced] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId, status: 'SUBSCRIBED' } }),
    prisma.contact.count({ where: { organizationId: orgId, status: 'UNSUBSCRIBED' } }),
    prisma.contact.count({ where: { organizationId: orgId, status: 'BOUNCED' } }),
  ]);
  return { total, subscribed, unsubscribed, bounced };
}

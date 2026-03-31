import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPaginationParams, paginatedResponse } from '../utils/pagination';

export async function listLists(orgId: string) {
  const lists = await prisma.list.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { contacts: true } } },
  });
  return lists;
}

export async function createList(orgId: string, data: { name: string; description?: string; doubleOptIn?: boolean }) {
  return prisma.list.create({ data: { ...data, organizationId: orgId } });
}

export async function getList(orgId: string, id: string) {
  const list = await prisma.list.findFirst({
    where: { id, organizationId: orgId },
    include: { _count: { select: { contacts: true } } },
  });
  if (!list) throw new AppError(404, 'List not found');
  return list;
}

export async function updateList(orgId: string, id: string, data: Partial<{ name: string; description: string; doubleOptIn: boolean }>) {
  const list = await prisma.list.findFirst({ where: { id, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');
  return prisma.list.update({ where: { id }, data });
}

export async function deleteList(orgId: string, id: string) {
  const list = await prisma.list.findFirst({ where: { id, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');
  await prisma.list.delete({ where: { id } });
}

export async function getListContacts(orgId: string, listId: string, query: Record<string, unknown>) {
  const list = await prisma.list.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');

  const { page, limit, skip } = getPaginationParams(query);
  const [memberships, total] = await Promise.all([
    prisma.listContact.findMany({
      where: { listId },
      skip,
      take: limit,
      include: { contact: true },
      orderBy: { addedAt: 'desc' },
    }),
    prisma.listContact.count({ where: { listId } }),
  ]);

  return paginatedResponse(memberships.map((m) => m.contact), total, page, limit);
}

export async function addContactsToList(orgId: string, listId: string, contactIds: string[]) {
  const list = await prisma.list.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');

  // Verify all contacts belong to org
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, organizationId: orgId },
  });

  if (contacts.length !== contactIds.length) {
    throw new AppError(400, 'Some contacts not found in this organization');
  }

  await prisma.listContact.createMany({
    data: contactIds.map((contactId) => ({ listId, contactId })),
    skipDuplicates: true,
  });
}

export async function removeContactsFromList(orgId: string, listId: string, contactIds: string[]) {
  const list = await prisma.list.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');

  await prisma.listContact.deleteMany({
    where: { listId, contactId: { in: contactIds } },
  });
}

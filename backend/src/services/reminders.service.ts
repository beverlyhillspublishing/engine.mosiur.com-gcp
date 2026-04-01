import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── Lists ────────────────────────────────────────────────────────────────────

export async function listReminderLists(orgId: string) {
  return prisma.reminderList.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { reminders: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createReminderList(orgId: string, userId: string, name: string, color?: string) {
  return prisma.reminderList.create({
    data: { name, color: color || '#ef4444', organizationId: orgId, createdById: userId },
  });
}

export async function updateReminderList(orgId: string, id: string, data: { name?: string; color?: string }) {
  const list = await prisma.reminderList.findFirst({ where: { id, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');
  return prisma.reminderList.update({ where: { id }, data });
}

export async function deleteReminderList(orgId: string, id: string) {
  const list = await prisma.reminderList.findFirst({ where: { id, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');
  await prisma.reminder.deleteMany({ where: { listId: id } });
  await prisma.reminderList.delete({ where: { id } });
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export async function listReminders(orgId: string, listId: string, includeCompleted = false) {
  const list = await prisma.reminderList.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');

  return prisma.reminder.findMany({
    where: {
      listId,
      organizationId: orgId,
      parentId: null, // top-level only
      ...(includeCompleted ? {} : { isCompleted: false }),
    },
    include: {
      subtasks: {
        where: includeCompleted ? {} : { isCompleted: false },
        orderBy: { priority: 'desc' },
      },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createReminder(
  orgId: string,
  userId: string,
  listId: string,
  data: {
    title: string;
    notes?: string;
    dueDate?: string;
    priority?: number;
    parentId?: string;
  },
) {
  const list = await prisma.reminderList.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) throw new AppError(404, 'List not found');

  return prisma.reminder.create({
    data: {
      listId,
      title: data.title,
      notes: data.notes,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority ?? 0,
      parentId: data.parentId,
      organizationId: orgId,
      createdById: userId,
    },
  });
}

export async function updateReminder(
  orgId: string,
  id: string,
  data: { title?: string; notes?: string; dueDate?: string | null; priority?: number },
) {
  const reminder = await prisma.reminder.findFirst({ where: { id, organizationId: orgId } });
  if (!reminder) throw new AppError(404, 'Reminder not found');
  return prisma.reminder.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
}

export async function toggleReminder(orgId: string, id: string) {
  const reminder = await prisma.reminder.findFirst({ where: { id, organizationId: orgId } });
  if (!reminder) throw new AppError(404, 'Reminder not found');
  const isCompleted = !reminder.isCompleted;
  return prisma.reminder.update({
    where: { id },
    data: { isCompleted, completedAt: isCompleted ? new Date() : null },
  });
}

export async function deleteReminder(orgId: string, id: string) {
  const reminder = await prisma.reminder.findFirst({ where: { id, organizationId: orgId } });
  if (!reminder) throw new AppError(404, 'Reminder not found');
  // Delete subtasks first
  await prisma.reminder.deleteMany({ where: { parentId: id } });
  await prisma.reminder.delete({ where: { id } });
}

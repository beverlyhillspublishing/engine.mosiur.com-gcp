import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function listNoteFolders(orgId: string) {
  return prisma.noteFolder.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { notes: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createNoteFolder(orgId: string, userId: string, name: string, color?: string) {
  return prisma.noteFolder.create({ data: { name, color, organizationId: orgId, createdById: userId } });
}

export async function renameNoteFolder(orgId: string, id: string, name: string) {
  const folder = await prisma.noteFolder.findFirst({ where: { id, organizationId: orgId } });
  if (!folder) throw new AppError(404, 'Folder not found');
  return prisma.noteFolder.update({ where: { id }, data: { name } });
}

export async function deleteNoteFolder(orgId: string, id: string) {
  const folder = await prisma.noteFolder.findFirst({ where: { id, organizationId: orgId } });
  if (!folder) throw new AppError(404, 'Folder not found');
  // Move notes to root (no folder) before deleting
  await prisma.note.updateMany({ where: { folderId: id, organizationId: orgId }, data: { folderId: null } });
  await prisma.noteFolder.delete({ where: { id } });
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function listNotes(orgId: string, folderId?: string) {
  return prisma.note.findMany({
    where: { organizationId: orgId, ...(folderId !== undefined ? { folderId } : {}) },
    select: { id: true, title: true, isPinned: true, folderId: true, createdAt: true, updatedAt: true, createdById: true },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function getNote(orgId: string, id: string) {
  const note = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

export async function createNote(orgId: string, userId: string, data: { title?: string; content?: object; folderId?: string }) {
  return prisma.note.create({
    data: {
      title: data.title || 'Untitled Note',
      content: data.content ?? {},
      folderId: data.folderId,
      organizationId: orgId,
      createdById: userId,
    },
  });
}

export async function updateNote(orgId: string, id: string, data: { title?: string; content?: object; folderId?: string; isPinned?: boolean }) {
  const note = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!note) throw new AppError(404, 'Note not found');
  return prisma.note.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
}

export async function deleteNote(orgId: string, id: string) {
  const note = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!note) throw new AppError(404, 'Note not found');
  await prisma.note.delete({ where: { id } });
}

export async function searchNotes(orgId: string, q: string) {
  return prisma.note.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, title: true, isPinned: true, folderId: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
}

export async function getRecentNotes(orgId: string, limit = 10) {
  return prisma.note.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true, updatedAt: true, folderId: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

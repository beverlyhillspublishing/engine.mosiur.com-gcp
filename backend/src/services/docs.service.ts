import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { DocumentType } from '@prisma/client';

export async function listDocuments(orgId: string, type?: DocumentType) {
  return prisma.tpDocument.findMany({
    where: { organizationId: orgId, ...(type ? { type } : {}) },
    select: {
      id: true, title: true, type: true, thumbnailUrl: true, createdAt: true, updatedAt: true, createdById: true,
      collaborators: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getDocument(orgId: string, id: string, userId: string) {
  const doc = await prisma.tpDocument.findFirst({
    where: {
      id,
      OR: [
        { organizationId: orgId },
        { collaborators: { some: { userId } } },
      ],
    },
    include: {
      collaborators: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });
  if (!doc) throw new AppError(404, 'Document not found');
  return doc;
}

export async function createDocument(orgId: string, userId: string, type: DocumentType, title?: string) {
  const defaultContent = getDefaultContent(type);
  return prisma.tpDocument.create({
    data: {
      title: title || 'Untitled',
      type,
      content: defaultContent,
      organizationId: orgId,
      createdById: userId,
    },
  });
}

function getDefaultContent(type: DocumentType): object {
  switch (type) {
    case 'PAGES':
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    case 'NUMBERS':
      return { sheets: [{ name: 'Sheet 1', data: Array.from({ length: 100 }, () => Array(26).fill(null)) }] };
    case 'KEYNOTE':
      return { slides: [{ id: '1', background: '#ffffff', elements: [] }], theme: { fontFamily: 'Inter', primaryColor: '#3b82f6' } };
    default:
      return {};
  }
}

export async function updateDocument(orgId: string, id: string, userId: string, data: { title?: string; content?: object; thumbnailUrl?: string }) {
  const doc = await prisma.tpDocument.findFirst({
    where: {
      id,
      OR: [
        { organizationId: orgId, createdById: userId },
        { collaborators: { some: { userId, role: 'editor' } } },
      ],
    },
  });
  if (!doc) throw new AppError(404, 'Document not found or no edit permission');
  return prisma.tpDocument.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
}

export async function deleteDocument(orgId: string, id: string, userId: string) {
  const doc = await prisma.tpDocument.findFirst({ where: { id, organizationId: orgId, createdById: userId } });
  if (!doc) throw new AppError(404, 'Document not found');
  await prisma.docCollaborator.deleteMany({ where: { documentId: id } });
  await prisma.tpDocument.delete({ where: { id } });
}

export async function addCollaborator(orgId: string, documentId: string, ownerId: string, email: string, role: 'viewer' | 'editor') {
  const doc = await prisma.tpDocument.findFirst({ where: { id: documentId, organizationId: orgId, createdById: ownerId } });
  if (!doc) throw new AppError(404, 'Document not found');

  const user = await prisma.user.findFirst({
    where: { email, members: { some: { organizationId: orgId } } },
  });
  if (!user) throw new AppError(404, 'User not found in this organization');

  return prisma.docCollaborator.upsert({
    where: { documentId_userId: { documentId, userId: user.id } },
    update: { role },
    create: { documentId, userId: user.id, role },
  });
}

export async function removeCollaborator(orgId: string, documentId: string, ownerId: string, collaboratorId: string) {
  const doc = await prisma.tpDocument.findFirst({ where: { id: documentId, organizationId: orgId, createdById: ownerId } });
  if (!doc) throw new AppError(404, 'Document not found');
  await prisma.docCollaborator.deleteMany({ where: { documentId, userId: collaboratorId } });
}

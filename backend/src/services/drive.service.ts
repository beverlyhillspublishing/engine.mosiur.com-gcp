import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET || '';
const GCS_KEY_PREFIX = 'drive';

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function listFolders(orgId: string, parentId?: string) {
  return prisma.driveFolder.findMany({
    where: { organizationId: orgId, parentId: parentId ?? null },
    include: { _count: { select: { files: true, children: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createFolder(orgId: string, userId: string, name: string, parentId?: string) {
  if (parentId) {
    const parent = await prisma.driveFolder.findFirst({ where: { id: parentId, organizationId: orgId } });
    if (!parent) throw new AppError(404, 'Parent folder not found');
  }
  return prisma.driveFolder.create({
    data: { name, parentId, organizationId: orgId, createdById: userId },
  });
}

export async function renameFolder(orgId: string, id: string, name: string) {
  const folder = await prisma.driveFolder.findFirst({ where: { id, organizationId: orgId } });
  if (!folder) throw new AppError(404, 'Folder not found');
  return prisma.driveFolder.update({ where: { id }, data: { name } });
}

export async function deleteFolder(orgId: string, id: string) {
  const folder = await prisma.driveFolder.findFirst({ where: { id, organizationId: orgId } });
  if (!folder) throw new AppError(404, 'Folder not found');
  // Delete GCS files inside this folder recursively
  await deleteFolderRecursive(orgId, id);
  await prisma.driveFolder.delete({ where: { id } });
}

async function deleteFolderRecursive(orgId: string, folderId: string) {
  const files = await prisma.driveFile.findMany({ where: { folderId, organizationId: orgId } });
  for (const f of files) {
    try { await storage.bucket(BUCKET).file(f.gcsKey).delete(); } catch {}
  }
  await prisma.driveFile.deleteMany({ where: { folderId, organizationId: orgId } });

  const children = await prisma.driveFolder.findMany({ where: { parentId: folderId, organizationId: orgId } });
  for (const child of children) {
    await deleteFolderRecursive(orgId, child.id);
  }
  await prisma.driveFolder.deleteMany({ where: { parentId: folderId, organizationId: orgId } });
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function listFiles(orgId: string, folderId?: string) {
  return prisma.driveFile.findMany({
    where: { organizationId: orgId, folderId: folderId ?? null },
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function requestUploadUrl(
  orgId: string,
  userId: string,
  name: string,
  mimeType: string,
  size: number,
  folderId?: string,
) {
  if (folderId) {
    const folder = await prisma.driveFolder.findFirst({ where: { id: folderId, organizationId: orgId } });
    if (!folder) throw new AppError(404, 'Folder not found');
  }

  const fileId = uuidv4();
  const gcsKey = `${GCS_KEY_PREFIX}/${orgId}/${fileId}/${name}`;

  const [signedUrl] = await storage.bucket(BUCKET).file(gcsKey).getSignedUrl({
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: mimeType,
  });

  // Create a pending record
  const driveFile = await prisma.driveFile.create({
    data: {
      id: fileId,
      name,
      mimeType,
      size: BigInt(size),
      gcsKey,
      folderId,
      organizationId: orgId,
      uploadedById: userId,
    },
  });

  return { uploadUrl: signedUrl, fileId: driveFile.id };
}

export async function confirmUpload(orgId: string, fileId: string) {
  const file = await prisma.driveFile.findFirst({ where: { id: fileId, organizationId: orgId } });
  if (!file) throw new AppError(404, 'File not found');

  // Verify file exists in GCS
  const [exists] = await storage.bucket(BUCKET).file(file.gcsKey).exists();
  if (!exists) throw new AppError(400, 'Upload not found in storage');

  return prisma.driveFile.update({ where: { id: fileId }, data: { updatedAt: new Date() } });
}

export async function getDownloadUrl(orgId: string, fileId: string) {
  const file = await prisma.driveFile.findFirst({ where: { id: fileId, organizationId: orgId } });
  if (!file) throw new AppError(404, 'File not found');

  const [url] = await storage.bucket(BUCKET).file(file.gcsKey).getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return { url, file };
}

export async function renameFile(orgId: string, fileId: string, name: string) {
  const file = await prisma.driveFile.findFirst({ where: { id: fileId, organizationId: orgId } });
  if (!file) throw new AppError(404, 'File not found');
  return prisma.driveFile.update({ where: { id: fileId }, data: { name } });
}

export async function moveFile(orgId: string, fileId: string, folderId: string | null) {
  const file = await prisma.driveFile.findFirst({ where: { id: fileId, organizationId: orgId } });
  if (!file) throw new AppError(404, 'File not found');
  if (folderId) {
    const folder = await prisma.driveFolder.findFirst({ where: { id: folderId, organizationId: orgId } });
    if (!folder) throw new AppError(404, 'Folder not found');
  }
  return prisma.driveFile.update({ where: { id: fileId }, data: { folderId } });
}

export async function deleteFile(orgId: string, fileId: string) {
  const file = await prisma.driveFile.findFirst({ where: { id: fileId, organizationId: orgId } });
  if (!file) throw new AppError(404, 'File not found');
  try { await storage.bucket(BUCKET).file(file.gcsKey).delete(); } catch {}
  await prisma.driveFile.delete({ where: { id: fileId } });
}

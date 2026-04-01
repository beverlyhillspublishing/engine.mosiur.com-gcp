import { Router, Request, Response, NextFunction } from 'express';
import * as driveService from '../services/drive.service';

const router = Router({ mergeParams: true });

// ─── Folders ──────────────────────────────────────────────────────────────────
router.get('/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.params.orgId;
    const parentId = req.query.parentId as string | undefined;
    res.json(await driveService.listFolders(orgId, parentId));
  } catch (e) { next(e); }
});

router.post('/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, parentId } = req.body;
    res.status(201).json(await driveService.createFolder(req.params.orgId, req.user!.id, name, parentId));
  } catch (e) { next(e); }
});

router.patch('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await driveService.renameFolder(req.params.orgId, req.params.id, req.body.name));
  } catch (e) { next(e); }
});

router.delete('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await driveService.deleteFolder(req.params.orgId, req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── Files ────────────────────────────────────────────────────────────────────
router.get('/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = req.query.folderId as string | undefined;
    res.json(await driveService.listFiles(req.params.orgId, folderId));
  } catch (e) { next(e); }
});

router.post('/files/upload-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, mimeType, size, folderId } = req.body;
    res.json(await driveService.requestUploadUrl(req.params.orgId, req.user!.id, name, mimeType, size, folderId));
  } catch (e) { next(e); }
});

router.post('/files/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await driveService.confirmUpload(req.params.orgId, req.params.id));
  } catch (e) { next(e); }
});

router.get('/files/:id/url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await driveService.getDownloadUrl(req.params.orgId, req.params.id));
  } catch (e) { next(e); }
});

router.patch('/files/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, folderId } = req.body;
    if (name !== undefined) res.json(await driveService.renameFile(req.params.orgId, req.params.id, name));
    else res.json(await driveService.moveFile(req.params.orgId, req.params.id, folderId));
  } catch (e) { next(e); }
});

router.delete('/files/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await driveService.deleteFile(req.params.orgId, req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;

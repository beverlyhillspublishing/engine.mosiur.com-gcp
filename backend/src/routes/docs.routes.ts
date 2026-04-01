import { Router, Request, Response, NextFunction } from 'express';
import * as docsService from '../services/docs.service';
import { DocumentType } from '@prisma/client';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as DocumentType | undefined;
    res.json(await docsService.listDocuments(req.params.orgId, type));
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await docsService.getDocument(req.params.orgId, req.params.id, req.user!.id));
  } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, title } = req.body;
    res.status(201).json(await docsService.createDocument(req.params.orgId, req.user!.id, type as DocumentType, title));
  } catch (e) { next(e); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await docsService.updateDocument(req.params.orgId, req.params.id, req.user!.id, req.body));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await docsService.deleteDocument(req.params.orgId, req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/:id/collaborators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;
    res.status(201).json(await docsService.addCollaborator(req.params.orgId, req.params.id, req.user!.id, email, role));
  } catch (e) { next(e); }
});

router.delete('/:id/collaborators/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await docsService.removeCollaborator(req.params.orgId, req.params.id, req.user!.id, req.params.userId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;

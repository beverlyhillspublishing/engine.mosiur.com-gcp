import { Router, Request, Response, NextFunction } from 'express';
import * as notesService from '../services/notes.service';

const router = Router({ mergeParams: true });

// ─── Folders ──────────────────────────────────────────────────────────────────
router.get('/folders', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await notesService.listNoteFolders(req.params.orgId)); } catch (e) { next(e); }
});

router.post('/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await notesService.createNoteFolder(req.params.orgId, req.user!.id, req.body.name, req.body.color));
  } catch (e) { next(e); }
});

router.patch('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await notesService.renameNoteFolder(req.params.orgId, req.params.id, req.body.name));
  } catch (e) { next(e); }
});

router.delete('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await notesService.deleteNoteFolder(req.params.orgId, req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

// ─── Notes ────────────────────────────────────────────────────────────────────
router.get('/recent', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await notesService.getRecentNotes(req.params.orgId)); } catch (e) { next(e); }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await notesService.searchNotes(req.params.orgId, req.query.q as string)); } catch (e) { next(e); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = req.query.folderId as string | undefined;
    res.json(await notesService.listNotes(req.params.orgId, folderId));
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await notesService.getNote(req.params.orgId, req.params.id)); } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await notesService.createNote(req.params.orgId, req.user!.id, req.body));
  } catch (e) { next(e); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await notesService.updateNote(req.params.orgId, req.params.id, req.body));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await notesService.deleteNote(req.params.orgId, req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

export default router;

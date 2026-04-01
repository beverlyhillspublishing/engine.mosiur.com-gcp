import { Router, Request, Response, NextFunction } from 'express';
import * as mailService from '../services/mail.service';
import { mailSyncQueue } from '../queues/queues';

const router = Router({ mergeParams: true });

// ─── Accounts ─────────────────────────────────────────────────────────────────
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await mailService.listMailAccounts(req.params.orgId, req.user!.id));
  } catch (e) { next(e); }
});

router.post('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await mailService.createMailAccount(req.params.orgId, req.user!.id, req.body);
    // Kick off initial sync
    await mailSyncQueue.add('sync', { accountId: account.id });
    res.status(201).json(account);
  } catch (e) { next(e); }
});

router.delete('/accounts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mailService.deleteMailAccount(req.params.orgId, req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/accounts/:id/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mailSyncQueue.add('sync', { accountId: req.params.id });
    res.json({ queued: true });
  } catch (e) { next(e); }
});

// ─── Threads ──────────────────────────────────────────────────────────────────
router.get('/accounts/:accountId/threads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folder, page, limit } = req.query as { folder?: string; page?: string; limit?: string };
    res.json(await mailService.listThreads(req.params.orgId, req.params.accountId, {
      folder,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    }));
  } catch (e) { next(e); }
});

router.get('/threads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await mailService.getThread(req.params.orgId, req.params.id));
  } catch (e) { next(e); }
});

router.patch('/threads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await mailService.updateThread(req.params.orgId, req.params.id, req.body));
  } catch (e) { next(e); }
});

// ─── Search ───────────────────────────────────────────────────────────────────
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, accountId } = req.query as { q: string; accountId?: string };
    res.json(await mailService.searchThreads(req.params.orgId, q, accountId));
  } catch (e) { next(e); }
});

// ─── Compose ──────────────────────────────────────────────────────────────────
router.post('/compose', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, ...data } = req.body;
    res.json(await mailService.composeEmail(req.params.orgId, req.user!.id, accountId, data));
  } catch (e) { next(e); }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import * as remindersService from '../services/reminders.service';

const router = Router({ mergeParams: true });

// ─── Lists ────────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await remindersService.listReminderLists(req.params.orgId)); } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await remindersService.createReminderList(req.params.orgId, req.user!.id, req.body.name, req.body.color));
  } catch (e) { next(e); }
});

router.patch('/:listId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await remindersService.updateReminderList(req.params.orgId, req.params.listId, req.body));
  } catch (e) { next(e); }
});

router.delete('/:listId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await remindersService.deleteReminderList(req.params.orgId, req.params.listId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.get('/:listId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeCompleted = req.query.completed === 'true';
    res.json(await remindersService.listReminders(req.params.orgId, req.params.listId, includeCompleted));
  } catch (e) { next(e); }
});

router.post('/:listId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await remindersService.createReminder(req.params.orgId, req.user!.id, req.params.listId, req.body));
  } catch (e) { next(e); }
});

router.patch('/:listId/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await remindersService.updateReminder(req.params.orgId, req.params.id, req.body));
  } catch (e) { next(e); }
});

router.post('/:listId/tasks/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await remindersService.toggleReminder(req.params.orgId, req.params.id));
  } catch (e) { next(e); }
});

router.delete('/:listId/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await remindersService.deleteReminder(req.params.orgId, req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import * as calendarService from '../services/calendar.service';

const router = Router({ mergeParams: true });

// ─── Calendars ────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await calendarService.listCalendars(req.params.orgId)); } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await calendarService.createCalendar(req.params.orgId, req.user!.id, req.body));
  } catch (e) { next(e); }
});

router.patch('/:calendarId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await calendarService.updateCalendar(req.params.orgId, req.params.calendarId, req.body));
  } catch (e) { next(e); }
});

router.delete('/:calendarId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await calendarService.deleteCalendar(req.params.orgId, req.params.calendarId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── Events ───────────────────────────────────────────────────────────────────
router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { calendarId, start, end } = req.query as { calendarId?: string; start: string; end: string };
    res.json(await calendarService.listEvents(req.params.orgId, calendarId, start, end));
  } catch (e) { next(e); }
});

router.post('/:calendarId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await calendarService.createEvent(req.params.orgId, req.user!.id, req.params.calendarId, req.body));
  } catch (e) { next(e); }
});

router.patch('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await calendarService.updateEvent(req.params.orgId, req.params.id, req.body));
  } catch (e) { next(e); }
});

router.delete('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await calendarService.deleteEvent(req.params.orgId, req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;

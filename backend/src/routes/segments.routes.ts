import { Router } from 'express';
import * as service from '../services/segment.service';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try { res.json(await service.listSegments(req.org!.id)); } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  try { res.status(201).json(await service.createSegment(req.org!.id, req.body)); } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => {
  try { res.json(await service.getSegment(req.org!.id, req.params.id)); } catch (e) { next(e); }
});
router.patch('/:id', async (req, res, next) => {
  try { res.json(await service.updateSegment(req.org!.id, req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => {
  try { await service.deleteSegment(req.org!.id, req.params.id); res.status(204).send(); } catch (e) { next(e); }
});
router.get('/:id/count', async (req, res, next) => {
  try { res.json(await service.getSegmentCount(req.org!.id, req.params.id)); } catch (e) { next(e); }
});

export default router;

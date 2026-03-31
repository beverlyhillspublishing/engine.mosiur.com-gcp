import { Router } from 'express';
import * as ctrl from '../controllers/campaigns.controller';

const router = Router({ mergeParams: true });

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/send', ctrl.send);
router.post('/:id/schedule', ctrl.schedule);
router.post('/:id/duplicate', ctrl.duplicate);
router.get('/:id/stats', ctrl.stats);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/tracking.controller';

const router = Router();

router.get('/:token', ctrl.unsubscribePage);
router.post('/:token', ctrl.unsubscribeConfirm);

export default router;

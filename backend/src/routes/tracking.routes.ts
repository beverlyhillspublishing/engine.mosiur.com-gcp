import { Router } from 'express';
import * as ctrl from '../controllers/tracking.controller';

const router = Router();

router.get('/o/:sendId', ctrl.openPixel);
router.get('/c/:token', ctrl.clickRedirect);

export default router;

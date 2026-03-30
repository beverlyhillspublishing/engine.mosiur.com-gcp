import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller';

const router = Router({ mergeParams: true });

router.get('/overview', ctrl.overview);
router.get('/sends', ctrl.sendsSeries);
router.get('/opens', ctrl.opensSeries);
router.get('/clicks', ctrl.clicksSeries);
router.get('/top-campaigns', ctrl.topCampaigns);
router.get('/subscribers', ctrl.subscriberGrowth);

export default router;

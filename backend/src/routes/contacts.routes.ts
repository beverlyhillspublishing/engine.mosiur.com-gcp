import { Router } from 'express';
import * as ctrl from '../controllers/contacts.controller';
import multer from 'multer';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/stats', ctrl.stats);
router.post('/import', upload.single('file'), ctrl.importCsv);
router.get('/import/:jobId', ctrl.importStatus);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;

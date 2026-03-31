import { Router } from 'express';
import * as service from '../services/list.service';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try { res.json(await service.listLists(req.org!.id)); } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  try { res.status(201).json(await service.createList(req.org!.id, req.body)); } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => {
  try { res.json(await service.getList(req.org!.id, req.params.id)); } catch (e) { next(e); }
});
router.patch('/:id', async (req, res, next) => {
  try { res.json(await service.updateList(req.org!.id, req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => {
  try { await service.deleteList(req.org!.id, req.params.id); res.status(204).send(); } catch (e) { next(e); }
});
router.get('/:id/contacts', async (req, res, next) => {
  try { res.json(await service.getListContacts(req.org!.id, req.params.id, req.query as Record<string, unknown>)); } catch (e) { next(e); }
});
router.post('/:id/contacts', async (req, res, next) => {
  try { await service.addContactsToList(req.org!.id, req.params.id, req.body.contactIds); res.json({ message: 'Contacts added' }); } catch (e) { next(e); }
});
router.delete('/:id/contacts', async (req, res, next) => {
  try { await service.removeContactsFromList(req.org!.id, req.params.id, req.body.contactIds); res.json({ message: 'Contacts removed' }); } catch (e) { next(e); }
});

export default router;

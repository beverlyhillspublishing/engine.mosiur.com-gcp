import { Request, Response, NextFunction } from 'express';
import * as service from '../services/contact.service';
import { importQueue } from '../queues/queues';
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.listContacts(req.org!.id, req.query as Record<string, unknown>)); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createContact(req.org!.id, req.body)); } catch (e) { next(e); }
};
export const get = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getContact(req.org!.id, req.params.id)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.updateContact(req.org!.id, req.params.id, req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteContact(req.org!.id, req.params.id); res.status(204).send(); } catch (e) { next(e); }
};
export const stats = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getContactStats(req.org!.id)); } catch (e) { next(e); }
};

export const importCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' });
    const jobId = uuidv4();
    const csvData = req.file.buffer.toString('utf-8');
    const columnMapping = JSON.parse(req.body.columnMapping || '{}');
    const listId = req.body.listId;

    await importQueue.add('process-csv-import', { orgId: req.org!.id, csvData, columnMapping, listId, jobId });
    res.status(202).json({ jobId, message: 'Import started' });
  } catch (e) { next(e); }
};

export const importStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await redisClient.get(`import:${req.params.jobId}`);
    if (!data) return res.status(404).json({ error: 'Import job not found' });
    res.json(JSON.parse(data));
  } catch (e) { next(e); }
};

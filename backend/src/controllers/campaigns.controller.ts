import { Request, Response, NextFunction } from 'express';
import * as service from '../services/campaign.service';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.listCampaigns(req.org!.id, req.query as Record<string, unknown>)); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createCampaign(req.org!.id, req.body)); } catch (e) { next(e); }
};
export const get = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getCampaign(req.org!.id, req.params.id)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.updateCampaign(req.org!.id, req.params.id, req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteCampaign(req.org!.id, req.params.id); res.status(204).send(); } catch (e) { next(e); }
};
export const send = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.sendCampaign(req.org!.id, req.params.id)); } catch (e) { next(e); }
};
export const schedule = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.scheduleCampaign(req.org!.id, req.params.id, new Date(req.body.scheduledAt))); } catch (e) { next(e); }
};
export const stats = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getCampaignStats(req.org!.id, req.params.id)); } catch (e) { next(e); }
};
export const duplicate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const original = await service.getCampaign(req.org!.id, req.params.id);
    const copy = await service.createCampaign(req.org!.id, {
      name: `Copy of ${original.name}`,
      subject: original.subject,
      fromName: original.fromName,
      fromEmail: original.fromEmail,
      replyToEmail: original.replyToEmail || undefined,
      htmlContent: original.htmlContent || undefined,
      textContent: original.textContent || undefined,
    });
    res.status(201).json(copy);
  } catch (e) { next(e); }
};

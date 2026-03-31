import { Request, Response, NextFunction } from 'express';
import * as service from '../services/analytics.service';

export const overview = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getOverview(req.org!.id)); } catch (e) { next(e); }
};
export const sendsSeries = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getTimeSeries(req.org!.id, 'sends', Number(req.query.days) || 30)); } catch (e) { next(e); }
};
export const opensSeries = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getTimeSeries(req.org!.id, 'opens', Number(req.query.days) || 30)); } catch (e) { next(e); }
};
export const clicksSeries = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getTimeSeries(req.org!.id, 'clicks', Number(req.query.days) || 30)); } catch (e) { next(e); }
};
export const topCampaigns = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getTopCampaigns(req.org!.id)); } catch (e) { next(e); }
};
export const subscriberGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getSubscriberGrowth(req.org!.id, Number(req.query.days) || 30)); } catch (e) { next(e); }
};

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { hashApiKey } from '../utils/hash';
import { AppError } from './errorHandler';

export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!key) throw new AppError(401, 'API key required');

    const keyHash = hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    });

    if (!apiKey) throw new AppError(401, 'Invalid API key');

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    req.org = apiKey.organization;
    next();
  } catch (err) {
    next(err);
  }
}

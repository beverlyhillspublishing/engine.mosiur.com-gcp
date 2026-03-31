import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new AppError(401, 'Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, firstName: true, lastName: true, emailVerified: true },
    });

    if (!user) throw new AppError(401, 'User not found');

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError(401, 'Invalid or expired token'));
  }
}

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';
import { Role } from '@prisma/client';

export async function loadOrganization(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.orgId;
    if (!orgId) return next();

    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: req.user!.id, organizationId: orgId } },
      include: { organization: true },
    });

    if (!membership) {
      throw new AppError(403, 'Access denied to this organization');
    }

    req.org = membership.organization;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

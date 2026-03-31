import { Router } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { requireRole } from '../middleware/tenancy';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.params.orgId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    res.json(members);
  } catch (e) { next(e); }
});

router.patch('/', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const org = await prisma.organization.update({
      where: { id: req.params.orgId },
      data: req.body,
    });
    res.json(org);
  } catch (e) { next(e); }
});

router.delete('/members/:userId', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const member = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: req.params.userId, organizationId: req.params.orgId } },
    });
    if (!member) throw new AppError(404, 'Member not found');
    if (member.role === 'OWNER') throw new AppError(400, 'Cannot remove owner');
    await prisma.organizationMember.delete({
      where: { userId_organizationId: { userId: req.params.userId, organizationId: req.params.orgId } },
    });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.patch('/members/:userId', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const member = await prisma.organizationMember.update({
      where: { userId_organizationId: { userId: req.params.userId, organizationId: req.params.orgId } },
      data: { role: req.body.role },
    });
    res.json(member);
  } catch (e) { next(e); }
});

export default router;

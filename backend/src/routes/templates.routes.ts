import { Router } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { OR: [{ organizationId: req.org!.id }, { isGlobal: true }] },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.create({
      data: { ...req.body, organizationId: req.org!.id, isGlobal: false },
    });
    res.status(201).json(template);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, OR: [{ organizationId: req.org!.id }, { isGlobal: true }] },
    });
    if (!template) throw new AppError(404, 'Template not found');
    res.json(template);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, organizationId: req.org!.id },
    });
    if (!template) throw new AppError(404, 'Template not found');
    res.json(await prisma.emailTemplate.update({ where: { id: req.params.id }, data: req.body }));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, organizationId: req.org!.id },
    });
    if (!template) throw new AppError(404, 'Template not found');
    await prisma.emailTemplate.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, OR: [{ organizationId: req.org!.id }, { isGlobal: true }] },
    });
    if (!original) throw new AppError(404, 'Template not found');
    const { id: _id, createdAt: _c, updatedAt: _u, isGlobal: _g, ...rest } = original;
    const copy = await prisma.emailTemplate.create({
      data: { ...rest, name: `Copy of ${original.name}`, organizationId: req.org!.id, isGlobal: false },
    });
    res.status(201).json(copy);
  } catch (e) { next(e); }
});

export default router;

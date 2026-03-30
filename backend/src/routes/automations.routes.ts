import { Router } from 'express';
import { prisma } from '../config/database';
import { automationQueue } from '../queues/queues';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const automations = await prisma.automation.findMany({
      where: { organizationId: req.org!.id },
      include: { _count: { select: { steps: true, enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(automations);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const automation = await prisma.automation.create({ data: { ...req.body, organizationId: req.org!.id, status: 'DRAFT' } });
    res.status(201).json(automation);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, organizationId: req.org!.id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!automation) throw new AppError(404, 'Automation not found');
    res.json(automation);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const automation = await prisma.automation.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!automation) throw new AppError(404, 'Automation not found');
    res.json(await prisma.automation.update({ where: { id: req.params.id }, data: req.body }));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const automation = await prisma.automation.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!automation) throw new AppError(404, 'Automation not found');
    await prisma.automation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.post('/:id/activate', async (req, res, next) => {
  try {
    const automation = await prisma.automation.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!automation) throw new AppError(404, 'Automation not found');
    res.json(await prisma.automation.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } }));
  } catch (e) { next(e); }
});

router.post('/:id/pause', async (req, res, next) => {
  try {
    const automation = await prisma.automation.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!automation) throw new AppError(404, 'Automation not found');
    res.json(await prisma.automation.update({ where: { id: req.params.id }, data: { status: 'PAUSED' } }));
  } catch (e) { next(e); }
});

// Steps
router.get('/:id/steps', async (req, res, next) => {
  try {
    const steps = await prisma.automationStep.findMany({
      where: { automationId: req.params.id },
      orderBy: { stepOrder: 'asc' },
    });
    res.json(steps);
  } catch (e) { next(e); }
});

router.post('/:id/steps', async (req, res, next) => {
  try {
    const count = await prisma.automationStep.count({ where: { automationId: req.params.id } });
    const step = await prisma.automationStep.create({
      data: { ...req.body, automationId: req.params.id, stepOrder: count + 1 },
    });
    res.status(201).json(step);
  } catch (e) { next(e); }
});

router.patch('/:id/steps/:stepId', async (req, res, next) => {
  try {
    const step = await prisma.automationStep.update({ where: { id: req.params.stepId }, data: req.body });
    res.json(step);
  } catch (e) { next(e); }
});

router.delete('/:id/steps/:stepId', async (req, res, next) => {
  try {
    await prisma.automationStep.delete({ where: { id: req.params.stepId } });
    res.status(204).send();
  } catch (e) { next(e); }
});

// Manual trigger enrollment
router.post('/:id/trigger', async (req, res, next) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, organizationId: req.org!.id, trigger: 'MANUAL' },
    });
    if (!automation) throw new AppError(404, 'Automation not found or not manual trigger');

    const { contactIds } = req.body as { contactIds: string[] };
    for (const contactId of contactIds) {
      await automationQueue.add('automation-step', { enrollmentId: '', stepId: '' }, {});
      // Create enrollment then enqueue first step
      const firstStep = await prisma.automationStep.findFirst({
        where: { automationId: req.params.id },
        orderBy: { stepOrder: 'asc' },
      });
      if (!firstStep) continue;

      const enrollment = await prisma.automationEnrollment.upsert({
        where: { automationId_contactId: { automationId: req.params.id, contactId } },
        create: { automationId: req.params.id, contactId, currentStepId: firstStep.id, status: 'ACTIVE' },
        update: { status: 'ACTIVE', currentStepId: firstStep.id },
      });

      await automationQueue.add('automation-step', { enrollmentId: enrollment.id, stepId: firstStep.id });
    }

    res.json({ message: `Enrolled ${contactIds.length} contacts` });
  } catch (e) { next(e); }
});

export default router;

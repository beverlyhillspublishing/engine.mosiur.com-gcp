import { Router } from 'express';
import { prisma } from '../config/database';
import { generateSecureToken } from '../utils/token';
import { webhookQueue } from '../queues/queues';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { organizationId: req.org!.id },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
    });
    res.json(endpoints);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const secret = generateSecureToken(24);
    const endpoint = await prisma.webhookEndpoint.create({
      data: { ...req.body, secret, organizationId: req.org!.id },
    });
    res.status(201).json({ ...endpoint, secret }); // Return secret once
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!ep) throw new AppError(404, 'Webhook endpoint not found');
    res.json(await prisma.webhookEndpoint.update({ where: { id: req.params.id }, data: req.body }));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!ep) throw new AppError(404, 'Webhook endpoint not found');
    await prisma.webhookEndpoint.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.post('/:id/test', async (req, res, next) => {
  try {
    const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!ep) throw new AppError(404, 'Webhook endpoint not found');

    const delivery = await prisma.webhookDelivery.create({
      data: { endpointId: ep.id, event: 'test.event', payload: { message: 'This is a test webhook delivery' } },
    });

    await webhookQueue.add('webhook-dispatch', { endpointId: ep.id, event: 'test.event', payload: { message: 'Test' }, deliveryId: delivery.id });
    res.json({ message: 'Test webhook dispatched' });
  } catch (e) { next(e); }
});

router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpointId: req.params.id, endpoint: { organizationId: req.org!.id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(deliveries);
  } catch (e) { next(e); }
});

export default router;

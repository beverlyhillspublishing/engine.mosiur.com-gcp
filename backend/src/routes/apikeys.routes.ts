import { Router } from 'express';
import { prisma } from '../config/database';
import { generateApiKey, hashApiKey } from '../utils/hash';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.org!.id },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    });
    res.json(keys);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { key, prefix } = generateApiKey();
    const keyHash = hashApiKey(key);
    await prisma.apiKey.create({
      data: { name: req.body.name, keyHash, prefix, organizationId: req.org!.id },
    });
    // Return the full key ONCE
    res.status(201).json({ key, prefix, message: 'Store this key securely — it will not be shown again.' });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!key) throw new AppError(404, 'API key not found');
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;

import { Router } from 'express';
import { prisma } from '../config/database';
import { encrypt } from '../utils/hash';
import { AppError } from '../middleware/errorHandler';
import { getEmailProvider } from '../email-providers';

const router = Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const senders = await prisma.senderProfile.findMany({
      where: { organizationId: req.org!.id },
      select: { id: true, name: true, provider: true, fromEmail: true, fromName: true, isDefault: true, createdAt: true },
    });
    res.json(senders);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, provider, fromEmail, fromName, isDefault, config: rawConfig } = req.body;
    const encryptedConfig = encrypt(JSON.stringify(rawConfig));
    const sender = await prisma.senderProfile.create({
      data: { name, provider, fromEmail, fromName, isDefault: isDefault || false, encryptedConfig, organizationId: req.org!.id },
    });
    res.status(201).json({ ...sender, encryptedConfig: undefined });
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.senderProfile.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!existing) throw new AppError(404, 'Sender not found');

    const { config: rawConfig, ...rest } = req.body;
    const updateData: Record<string, unknown> = { ...rest };
    if (rawConfig) updateData.encryptedConfig = encrypt(JSON.stringify(rawConfig));

    const updated = await prisma.senderProfile.update({ where: { id: req.params.id }, data: updateData });
    res.json({ ...updated, encryptedConfig: undefined });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.senderProfile.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!existing) throw new AppError(404, 'Sender not found');
    await prisma.senderProfile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.post('/:id/verify', async (req, res, next) => {
  try {
    const sender = await prisma.senderProfile.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
    if (!sender) throw new AppError(404, 'Sender not found');

    const provider = getEmailProvider(sender.provider, sender.encryptedConfig);
    const result = await provider.send({
      to: req.user!.email,
      subject: 'TechyPark — Sender Verification Test',
      html: '<p>This is a test email to verify your sender configuration is working correctly.</p>',
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
    });

    if (result.success) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (e) { next(e); }
});

export default router;

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { TRACKING_PIXEL_BUFFER, TRACKING_PIXEL_HEADERS } from '../utils/tracking-pixel';
import { addToSuppression } from '../services/suppression.service';
import { verifyUnsubscribeToken } from '../utils/token';
import { EventType } from '@prisma/client';

export async function openPixel(req: Request, res: Response, next: NextFunction) {
  try {
    const { sendId } = req.params;

    // Respond with pixel immediately (non-blocking analytics)
    res.set(TRACKING_PIXEL_HEADERS).send(TRACKING_PIXEL_BUFFER);

    // Record open async
    const send = await prisma.emailSend.findUnique({ where: { id: sendId } });
    if (send && !send.openedAt) {
      await prisma.emailSend.update({
        where: { id: sendId },
        data: {
          openedAt: new Date(),
          openCount: { increment: 1 },
          status: 'OPENED',
          events: { create: { type: EventType.OPENED, metadata: { ip: req.ip, ua: req.headers['user-agent'] } } },
        },
      });
    } else if (send) {
      await prisma.emailSend.update({ where: { id: sendId }, data: { openCount: { increment: 1 } } });
    }
  } catch (err) {
    // Don't fail pixel requests
    res.set(TRACKING_PIXEL_HEADERS).send(TRACKING_PIXEL_BUFFER);
  }
}

export async function clickRedirect(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const link = await prisma.trackedLink.findUnique({ where: { token } });

    if (!link) return res.redirect(302, '/');

    res.redirect(302, link.originalUrl);

    // Record click async
    await prisma.trackedLink.update({ where: { token }, data: { clickCount: { increment: 1 } } });

    if (link.sendId) {
      await prisma.emailSend.update({
        where: { id: link.sendId },
        data: {
          clickCount: { increment: 1 },
          status: 'CLICKED',
          events: {
            create: {
              type: EventType.CLICKED,
              metadata: { url: link.originalUrl, ip: req.ip, ua: req.headers['user-agent'] },
            },
          },
        },
      });
    }
  } catch (err) {
    res.redirect(302, '/');
  }
}

export async function unsubscribePage(req: Request, res: Response) {
  const verified = verifyUnsubscribeToken(req.params.token);
  if (!verified) {
    return res.status(400).send('<h1>Invalid unsubscribe link</h1>');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Unsubscribe</title><style>body{font-family:sans-serif;max-width:500px;margin:50px auto;text-align:center;}</style></head>
    <body>
      <h2>Unsubscribe</h2>
      <p>Click below to confirm that you want to unsubscribe from all emails.</p>
      <form method="POST" action="/unsub/${req.params.token}">
        <button type="submit" style="background:#e53e3e;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;font-size:16px;">
          Confirm Unsubscribe
        </button>
      </form>
    </body>
    </html>
  `);
}

export async function unsubscribeConfirm(req: Request, res: Response, next: NextFunction) {
  try {
    const verified = verifyUnsubscribeToken(req.params.token);
    if (!verified) return res.status(400).send('<h1>Invalid unsubscribe link</h1>');

    const { contactId, orgId } = verified;

    await Promise.all([
      prisma.contact.update({
        where: { id: contactId },
        data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
      }),
      addToSuppression(orgId, '', 'UNSUBSCRIBED').catch(() => {}), // will get email below
    ]);

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (contact) {
      await addToSuppression(orgId, contact.email, 'UNSUBSCRIBED');
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed</title><style>body{font-family:sans-serif;max-width:500px;margin:50px auto;text-align:center;}</style></head>
      <body>
        <h2>You've been unsubscribed</h2>
        <p>You won't receive any more emails from us. We're sorry to see you go!</p>
      </body>
      </html>
    `);
  } catch (err) {
    next(err);
  }
}

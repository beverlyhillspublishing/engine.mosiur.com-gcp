import { simpleParser } from 'mailparser';
import { redis } from '../config/redis';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

const TTL_SECONDS = 10 * 60; // 10 minutes

interface InboxRecord {
  id: string;
  address: string;
  status: 'waiting' | 'received' | 'expired';
  orgId: string;
  expiresAt: number;
}

function inboxKey(id: string) { return `inbound:${id}`; }
function htmlKey(id: string) { return `inbound:html:${id}`; }

export async function createInbox(orgId: string): Promise<{ id: string; address: string; expiresAt: Date }> {
  const id = uuidv4().replace(/-/g, '').slice(0, 10);
  const domain = config.ai?.inboundDomain || 'icloud.mosiur.com';
  const address = `import-${id}@${domain}`;
  const expiresAt = Date.now() + TTL_SECONDS * 1000;

  const record: InboxRecord = { id, address, status: 'waiting', orgId, expiresAt };
  await redis.set(inboxKey(id), JSON.stringify(record), 'EX', TTL_SECONDS);

  return { id, address, expiresAt: new Date(expiresAt) };
}

export async function pollInbox(id: string): Promise<{ status: 'waiting' | 'received' | 'expired'; html?: string }> {
  const raw = await redis.get(inboxKey(id));
  if (!raw) return { status: 'expired' };

  const record = JSON.parse(raw) as InboxRecord;

  if (Date.now() > record.expiresAt) {
    return { status: 'expired' };
  }

  if (record.status === 'received') {
    const html = await redis.get(htmlKey(id));
    return { status: 'received', html: html || undefined };
  }

  return { status: 'waiting' };
}

export async function receiveEmail(rawOrBody: string | Record<string, string>, toAddress?: string): Promise<void> {
  let html: string | undefined;
  let recipient: string | undefined;

  if (typeof rawOrBody === 'object') {
    // SendGrid-style JSON
    html = rawOrBody.html || rawOrBody.text;
    recipient = toAddress || rawOrBody.to || rawOrBody.envelope;
  } else {
    // Raw MIME
    const parsed = await simpleParser(rawOrBody);
    html = typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml || undefined);
    const toField = parsed.to;
    if (Array.isArray(toField)) {
      recipient = toAddress || toField[0]?.value?.[0]?.address;
    } else {
      recipient = toAddress || toField?.value?.[0]?.address;
    }
  }

  if (!recipient || !html) {
    throw new AppError(400, 'Could not extract email recipient or HTML body');
  }

  // Extract inbox ID from address (format: import-{id}@domain)
  const match = recipient.match(/import-([^@]+)@/i);
  if (!match) throw new AppError(400, 'Not a valid import address');

  const id = match[1];
  const raw = await redis.get(inboxKey(id));
  if (!raw) throw new AppError(404, 'Inbox not found or expired');

  const record = JSON.parse(raw) as InboxRecord;

  // Update status
  record.status = 'received';
  const remainingTtl = Math.max(0, Math.floor((record.expiresAt - Date.now()) / 1000));
  await redis.set(inboxKey(id), JSON.stringify(record), 'EX', remainingTtl);
  await redis.set(htmlKey(id), html, 'EX', remainingTtl);
}

export function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const key = config.ai?.inboundWebhookSecret || config.ai?.mailgunSigningKey;
  if (!key) return true; // Skip in dev

  const crypto = require('crypto');
  const computedSignature = crypto
    .createHmac('sha256', key)
    .update(timestamp + token)
    .digest('hex');

  return computedSignature === signature;
}

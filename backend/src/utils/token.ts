import crypto from 'crypto';
import { createHmac } from 'crypto';
import { config } from '../config';

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateApiKey(): { key: string; prefix: string } {
  const key = `tp_${generateSecureToken(24)}`;
  return { key, prefix: key.slice(0, 10) };
}

// HMAC-signed unsubscribe token — no DB lookup needed to verify
export function generateUnsubscribeToken(contactId: string, orgId: string): string {
  const payload = `${contactId}.${orgId}`;
  const sig = createHmac('sha256', config.jwt.accessSecret).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): { contactId: string; orgId: string } | null {
  try {
    const [payloadB64, sig] = token.split('.');
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = createHmac('sha256', config.jwt.accessSecret).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;
    const [contactId, orgId] = payload.split('.');
    return { contactId, orgId };
  } catch {
    return null;
  }
}

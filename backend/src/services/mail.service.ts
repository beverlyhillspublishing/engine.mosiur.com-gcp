import { ImapFlow } from 'imapflow';
import { simpleParser, AddressObject } from 'mailparser';
import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { encrypt, decrypt } from '../utils/hash';
import { logger } from '../utils/logger';

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function listMailAccounts(orgId: string, userId: string) {
  return prisma.mailAccount.findMany({
    where: { organizationId: orgId, userId },
    select: {
      id: true, label: true, email: true, provider: true,
      isDefault: true, lastSyncAt: true, syncStatus: true, syncError: true,
      imapHost: true, imapPort: true, smtpHost: true, smtpPort: true, username: true, useSSL: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createMailAccount(
  orgId: string,
  userId: string,
  data: {
    label: string;
    email: string;
    provider: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    useSSL?: boolean;
  },
) {
  const encryptedPass = encrypt(data.password);
  const isFirst = (await prisma.mailAccount.count({ where: { organizationId: orgId, userId } })) === 0;

  return prisma.mailAccount.create({
    data: {
      label: data.label,
      email: data.email,
      provider: data.provider,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      username: data.username,
      encryptedPass,
      useSSL: data.useSSL !== false,
      isDefault: isFirst,
      userId,
      organizationId: orgId,
    },
  });
}

export async function deleteMailAccount(orgId: string, userId: string, id: string) {
  const account = await prisma.mailAccount.findFirst({ where: { id, organizationId: orgId, userId } });
  if (!account) throw new AppError(404, 'Mail account not found');
  await prisma.mailAccount.delete({ where: { id } });
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export async function listThreads(
  orgId: string,
  accountId: string,
  options: { folder?: string; page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50, folder } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { accountId, organizationId: orgId };
  if (folder === 'starred') where['isStarred'] = true;
  else if (folder === 'archived') where['isArchived'] = true;
  else if (folder === 'trash') where['isTrashed'] = true;
  else { where['isArchived'] = false; where['isTrashed'] = false; }

  const [threads, total] = await Promise.all([
    prisma.mailThread.findMany({
      where,
      include: { _count: { select: { messages: true } } },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.mailThread.count({ where }),
  ]);

  return { threads, total, page, limit };
}

export async function getThread(orgId: string, threadId: string) {
  const thread = await prisma.mailThread.findFirst({
    where: { id: threadId, organizationId: orgId },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
    },
  });
  if (!thread) throw new AppError(404, 'Thread not found');

  // Mark as read
  if (!thread.isRead) {
    await prisma.mailThread.update({ where: { id: threadId }, data: { isRead: true } });
  }

  return thread;
}

export async function updateThread(orgId: string, threadId: string, data: { isStarred?: boolean; isArchived?: boolean; isTrashed?: boolean; isRead?: boolean }) {
  const thread = await prisma.mailThread.findFirst({ where: { id: threadId, organizationId: orgId } });
  if (!thread) throw new AppError(404, 'Thread not found');
  return prisma.mailThread.update({ where: { id: threadId }, data });
}

export async function searchThreads(orgId: string, q: string, accountId?: string) {
  return prisma.mailThread.findMany({
    where: {
      organizationId: orgId,
      ...(accountId ? { accountId } : {}),
      OR: [
        { subject: { contains: q, mode: 'insensitive' } },
        { snippet: { contains: q, mode: 'insensitive' } },
        { participantEmails: { has: q.toLowerCase() } },
      ],
    },
    include: { _count: { select: { messages: true } } },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  });
}

// ─── Compose ──────────────────────────────────────────────────────────────────

export async function composeEmail(
  orgId: string,
  userId: string,
  accountId: string,
  data: {
    to: string[];
    cc?: string[];
    subject: string;
    html: string;
    text?: string;
    replyToThreadId?: string;
  },
) {
  const account = await prisma.mailAccount.findFirst({ where: { id: accountId, organizationId: orgId, userId } });
  if (!account) throw new AppError(404, 'Mail account not found');

  const password = decrypt(account.encryptedPass);

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth: { user: account.username, pass: password },
  });

  const info = await transporter.sendMail({
    from: `${account.label} <${account.email}>`,
    to: data.to.join(', '),
    cc: data.cc?.join(', '),
    subject: data.subject,
    html: data.html,
    text: data.text,
  });

  return { messageId: info.messageId };
}

// ─── IMAP Sync ────────────────────────────────────────────────────────────────

export async function syncAccount(accountId: string) {
  const account = await prisma.mailAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  await prisma.mailAccount.update({ where: { id: accountId }, data: { syncStatus: 'syncing', syncError: null } });

  let client: ImapFlow | undefined;
  try {
    const password = decrypt(account.encryptedPass);

    client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.useSSL,
      auth: { user: account.username, pass: password },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = account.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const messages = client.fetch(
        { since },
        { uid: true, flags: true, envelope: true, source: true },
      );

      for await (const msg of messages) {
        try {
          const parsed = await simpleParser(msg.source);
          await upsertMessage(account, msg.uid, parsed);
        } catch (err) {
          logger.warn({ err, uid: msg.uid }, 'Failed to parse message');
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    await prisma.mailAccount.update({
      where: { id: accountId },
      data: { syncStatus: 'idle', lastSyncAt: new Date(), syncError: null },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    logger.error({ err, accountId }, 'Mail sync failed');
    await prisma.mailAccount.update({
      where: { id: accountId },
      data: { syncStatus: 'error', syncError: message },
    });
  } finally {
    if (client) {
      try { await client.logout(); } catch {}
    }
  }
}

async function upsertMessage(account: { id: string; organizationId: string }, uid: number, parsed: Awaited<ReturnType<typeof simpleParser>>) {
  const messageId = parsed.messageId || undefined;
  const fromAddr = parsed.from?.value?.[0];
  const fromEmail = fromAddr?.address || '';
  const fromName = fromAddr?.name || undefined;

  const toEmails = extractEmails(parsed.to);
  const ccEmails = extractEmails(parsed.cc);

  // Thread grouping: by In-Reply-To / References → find existing thread
  const references = parsed.references
    ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references]).filter(Boolean)
    : [];

  let threadId: string | undefined;

  if (references.length > 0) {
    const existing = await prisma.mailMessage.findFirst({
      where: { messageId: { in: references }, organizationId: account.organizationId },
      select: { threadId: true },
    });
    threadId = existing?.threadId;
  }

  if (!threadId) {
    // Check by message-id (dedup)
    if (messageId) {
      const existing = await prisma.mailMessage.findFirst({
        where: { messageId, organizationId: account.organizationId },
        select: { threadId: true },
      });
      threadId = existing?.threadId;
    }
  }

  const sentAt = parsed.date || new Date();
  const bodyHtml = typeof parsed.html === 'string' ? parsed.html : undefined;
  const bodyText = parsed.text || undefined;
  const subject = parsed.subject || undefined;
  const snippet = bodyText?.slice(0, 200) || '';

  const allParticipants = Array.from(new Set([fromEmail, ...toEmails, ...ccEmails].map((e) => e.toLowerCase()).filter(Boolean)));

  if (!threadId) {
    // Create new thread
    const thread = await prisma.mailThread.create({
      data: {
        accountId: account.id,
        subject: subject || '(no subject)',
        snippet,
        lastMessageAt: sentAt,
        participantEmails: allParticipants,
        organizationId: account.organizationId,
      },
    });
    threadId = thread.id;
  } else {
    // Update thread
    await prisma.mailThread.update({
      where: { id: threadId },
      data: {
        snippet,
        lastMessageAt: sentAt,
        isRead: false,
        messageCount: { increment: 1 },
        participantEmails: allParticipants,
      },
    });
  }

  // Upsert message
  await prisma.mailMessage.upsert({
    where: { threadId_imapUid: { threadId: threadId!, imapUid: uid } },
    update: {},
    create: {
      threadId: threadId!,
      imapUid: uid,
      messageId,
      fromEmail,
      fromName,
      toEmails,
      ccEmails,
      subject,
      bodyHtml,
      bodyText,
      hasAttachments: (parsed.attachments?.length || 0) > 0,
      sentAt,
      organizationId: account.organizationId,
    },
  });
}

function extractEmails(addr: AddressObject | AddressObject[] | undefined): string[] {
  if (!addr) return [];
  const list = Array.isArray(addr) ? addr : [addr];
  return list.flatMap((a) => a.value?.map((v) => v.address || '').filter(Boolean) || []);
}

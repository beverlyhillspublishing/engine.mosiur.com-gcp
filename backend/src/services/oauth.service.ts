import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { config } from '../config';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { addDays } from '../utils/date';
import { AppError } from '../middleware/errorHandler';

const googleClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri,
);

export function getGoogleAuthUrl(state: string): string {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

export async function handleGoogleCallback(code: string): Promise<{
  providerAccountId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}> {
  const { tokens } = await googleClient.getToken(code);
  if (!tokens.id_token) throw new AppError(400, 'No ID token from Google');

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new AppError(400, 'Could not retrieve user info from Google');

  return {
    providerAccountId: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    avatarUrl: payload.picture,
  };
}

export function getAppleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.apple.clientId,
    redirect_uri: config.apple.redirectUri,
    response_type: 'code id_token',
    scope: 'name email',
    response_mode: 'form_post',
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export async function handleAppleCallback(idToken: string): Promise<{
  providerAccountId: string;
  email: string;
}> {
  const appleUser = await appleSignin.verifyIdToken(idToken, {
    audience: config.apple.clientId,
    ignoreExpiration: false,
  });

  if (!appleUser.sub) throw new AppError(400, 'Could not retrieve user info from Apple');

  return {
    providerAccountId: appleUser.sub,
    // Apple may return a relay/private email or no email at all on subsequent logins
    email: (appleUser as { email?: string }).email || `${appleUser.sub}@privaterelay.appleid.com`,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Find an existing user by OAuth account, or create a new user+org if first login.
 * Existing email/password users who sign in with the same email get their account linked.
 */
export async function findOrCreateOAuthUser(
  provider: 'google' | 'apple',
  providerAccountId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  avatarUrl?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; firstName: string; lastName: string; emailVerified: boolean; avatarUrl?: string | null };
  organizations: { id: string; name: string; slug: string; role: string }[];
}> {
  // 1. Look up by OAuth account
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });

  if (existingOAuth) {
    return createSessionForUser(existingOAuth.user.id);
  }

  // 2. Look up user by email — link account if exists
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.oAuthAccount.create({
      data: { provider, providerAccountId, userId: existingUser.id },
    });
    // Update avatar if not set
    if (avatarUrl && !existingUser.avatarUrl) {
      await prisma.user.update({ where: { id: existingUser.id }, data: { avatarUrl } });
    }
    return createSessionForUser(existingUser.id);
  }

  // 3. Create brand-new user + organization
  const displayName = firstName || email.split('@')[0];
  const orgName = `${displayName}'s Workspace`;
  let slug = slugify(orgName);
  const slugConflict = await prisma.organization.findUnique({ where: { slug } });
  if (slugConflict) slug = `${slug}-${uuidv4().slice(0, 6)}`;

  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash: null,
      firstName: firstName || displayName,
      lastName: lastName || '',
      avatarUrl: avatarUrl || null,
      emailVerified: true, // OAuth providers have already verified the email
      oauthAccounts: {
        create: { provider, providerAccountId },
      },
      memberships: {
        create: {
          role: 'OWNER',
          organization: {
            create: { name: orgName, slug },
          },
        },
      },
    },
  });

  return createSessionForUser(newUser.id);
}

/** Create a JWT session (access + refresh token) for a given userId. */
export async function createSessionForUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const tokenId = uuidv4();
  const refreshTokenValue = signRefreshToken({ userId, tokenId });

  await prisma.refreshToken.create({
    data: {
      token: tokenId,
      userId,
      expiresAt: addDays(new Date(), 30),
    },
  });

  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
  });

  const accessToken = signAccessToken({ userId, email: user.email });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
    },
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role as string,
    })),
  };
}

/** Store an OAuth CSRF state token in Redis (5-min TTL). */
export async function storeOAuthState(state: string): Promise<void> {
  await redisClient.set(`oauth:state:${state}`, '1', 'EX', 300);
}

/** Consume (verify + delete) an OAuth CSRF state token. Returns false if invalid. */
export async function consumeOAuthState(state: string): Promise<boolean> {
  const val = await redisClient.get(`oauth:state:${state}`);
  if (!val) return false;
  await redisClient.del(`oauth:state:${state}`);
  return true;
}

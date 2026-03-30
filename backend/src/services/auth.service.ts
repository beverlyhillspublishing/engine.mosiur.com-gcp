import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateSecureToken } from '../utils/token';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from '../utils/date';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await hashPassword(data.password);
  const verifyToken = generateSecureToken();

  // Generate unique slug
  let slug = slugify(data.organizationName);
  const existing_org = await prisma.organization.findUnique({ where: { slug } });
  if (existing_org) slug = `${slug}-${uuidv4().slice(0, 6)}`;

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      verifyToken,
      memberships: {
        create: {
          role: 'OWNER',
          organization: {
            create: {
              name: data.organizationName,
              slug,
            },
          },
        },
      },
    },
    include: {
      memberships: { include: { organization: true } },
    },
  });

  return { user, verifyToken };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid email or password');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const tokenId = uuidv4();
  const refreshTokenValue = signRefreshToken({ userId: user.id, tokenId });

  await prisma.refreshToken.create({
    data: {
      token: tokenId,
      userId: user.id,
      expiresAt: addDays(new Date(), 30),
    },
  });

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    },
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
  };
}

export async function refreshAccessToken(refreshTokenJwt: string) {
  let payload: { userId: string; tokenId: string };
  try {
    payload = verifyRefreshToken(refreshTokenJwt);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: payload.tokenId } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired or revoked');
  }

  // Rotate: delete old, create new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newTokenId = uuidv4();
  const newRefreshToken = signRefreshToken({ userId: payload.userId, tokenId: newTokenId });

  await prisma.refreshToken.create({
    data: {
      token: newTokenId,
      userId: payload.userId,
      expiresAt: addDays(new Date(), 30),
    },
  });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError(401, 'User not found');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(refreshTokenJwt: string) {
  try {
    const payload = verifyRefreshToken(refreshTokenJwt);
    await prisma.refreshToken.deleteMany({ where: { token: payload.tokenId } });
  } catch {
    // Token invalid — that's fine, logout anyway
  }
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silent — don't reveal if email exists

  const resetToken = generateSecureToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry: addDays(new Date(), 1) },
  });

  return { resetToken, user };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) throw new AppError(400, 'Invalid verification token');

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });
}

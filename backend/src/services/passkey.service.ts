import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { createSessionForUser } from './oauth.service';

const { rpId, rpName, origin } = config.webauthn;

const CHALLENGE_TTL = 300; // 5 minutes

/** Generate WebAuthn registration options for an authenticated user. */
export async function getRegistrationOptions(userId: string, email: string, displayName: string) {
  const existingPasskeys = await prisma.passkey.findMany({ where: { userId } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userID: userId,
    userName: email,
    userDisplayName: displayName,
    attestation: 'none',
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  // Store challenge keyed by the challenge value itself (consumed on verify)
  await redisClient.set(`passkey:reg:${options.challenge}`, userId, 'EX', CHALLENGE_TTL);

  return options;
}

/** Verify registration response and persist the new Passkey to DB. */
export async function verifyRegistration(
  body: RegistrationResponseJSON,
  name?: string,
): Promise<{ id: string; name: string | null; deviceType: string; createdAt: Date }> {
  // Decode challenge from clientDataJSON to look up stored userId
  let expectedChallenge: string;
  let storedUserId: string | null;
  try {
    const clientData = JSON.parse(Buffer.from(body.response.clientDataJSON, 'base64url').toString());
    expectedChallenge = clientData.challenge;
    storedUserId = await redisClient.get(`passkey:reg:${expectedChallenge}`);
  } catch {
    throw new AppError(400, 'Invalid registration response');
  }

  if (!storedUserId) throw new AppError(400, 'Registration challenge expired or already used');
  await redisClient.del(`passkey:reg:${expectedChallenge}`);

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError(400, 'Passkey registration verification failed');
  }

  const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const passkey = await prisma.passkey.create({
    data: {
      credentialId: credentialID,
      publicKey: Buffer.from(credentialPublicKey),
      counter: BigInt(counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: (body.response as { transports?: string[] }).transports ?? [],
      name: name ?? null,
      userId: storedUserId,
    },
  });

  return {
    id: passkey.id,
    name: passkey.name,
    deviceType: passkey.deviceType,
    createdAt: passkey.createdAt,
  };
}

/** Generate WebAuthn authentication options. Optionally scoped to a specific user by email. */
export async function getAuthenticationOptions(email?: string) {
  let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] = [];

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const passkeys = await prisma.passkey.findMany({ where: { userId: user.id } });
      allowCredentials = passkeys.map((pk) => ({
        id: pk.credentialId,
        transports: pk.transports as AuthenticatorTransportFuture[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials,
    userVerification: 'preferred',
  });

  // Store the challenge (consumed on verify)
  await redisClient.set(`passkey:auth:${options.challenge}`, '1', 'EX', CHALLENGE_TTL);

  return options;
}

/** Verify authentication response and return a session for the matching user. */
export async function verifyAuthentication(body: AuthenticationResponseJSON) {
  // Decode challenge from clientDataJSON
  let expectedChallenge: string;
  try {
    const clientData = JSON.parse(Buffer.from(body.response.clientDataJSON, 'base64url').toString());
    expectedChallenge = clientData.challenge;
  } catch {
    throw new AppError(400, 'Invalid authentication response');
  }

  const stored = await redisClient.get(`passkey:auth:${expectedChallenge}`);
  if (!stored) throw new AppError(400, 'Authentication challenge expired or already used');
  await redisClient.del(`passkey:auth:${expectedChallenge}`);

  // Find passkey by credential ID from the response
  const credentialId = body.id;
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId },
    include: { user: true },
  });

  if (!passkey) throw new AppError(401, 'Passkey not found. Please register it first.');

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
    authenticator: {
      credentialID: passkey.credentialId,
      credentialPublicKey: passkey.publicKey,
      counter: Number(passkey.counter),
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) throw new AppError(401, 'Passkey authentication failed');

  // Update counter and lastUsedAt (counter check protects against cloned authenticators)
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return createSessionForUser(passkey.userId);
}

/** List all passkeys for a user (safe metadata only — no public keys). */
export async function listPasskeys(userId: string) {
  return prisma.passkey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      transports: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

/** Rename a passkey (user must own it). */
export async function renamePasskey(userId: string, passkeyId: string, name: string) {
  const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
  if (!passkey || passkey.userId !== userId) throw new AppError(404, 'Passkey not found');

  return prisma.passkey.update({ where: { id: passkeyId }, data: { name } });
}

/** Delete a passkey (user must own it). */
export async function deletePasskey(userId: string, passkeyId: string) {
  const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
  if (!passkey || passkey.userId !== userId) throw new AppError(404, 'Passkey not found');

  await prisma.passkey.delete({ where: { id: passkeyId } });
}

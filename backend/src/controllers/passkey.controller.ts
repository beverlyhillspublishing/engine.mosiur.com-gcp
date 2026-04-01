import { Request, Response, NextFunction } from 'express';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';
import * as passkeyService from '../services/passkey.service';
import { AppError } from '../middleware/errorHandler';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

/** POST /auth/passkey/register/options — generate registration options (requires auth) */
export async function getRegOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const displayName = `${user.firstName} ${user.lastName}`.trim();
    const options = await passkeyService.getRegistrationOptions(user.id, user.email, displayName);
    res.json(options);
  } catch (err) {
    next(err);
  }
}

/** POST /auth/passkey/register/verify — verify and save new passkey (requires auth) */
export async function verifyRegResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { credential: RegistrationResponseJSON; name?: string };
    if (!body.credential) throw new AppError(400, 'credential is required');

    const passkey = await passkeyService.verifyRegistration(body.credential, body.name);
    res.status(201).json({ passkey });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/passkey/authenticate/options — generate authentication options (public) */
export async function getAuthOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as { email?: string };
    const options = await passkeyService.getAuthenticationOptions(email);
    res.json(options);
  } catch (err) {
    next(err);
  }
}

/** POST /auth/passkey/authenticate/verify — verify assertion and issue session (public) */
export async function verifyAuthResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { credential: AuthenticationResponseJSON };
    if (!body.credential) throw new AppError(400, 'credential is required');

    const result = await passkeyService.verifyAuthentication(body.credential);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken: result.accessToken,
      user: result.user,
      organizations: result.organizations,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /auth/passkey — list user's passkeys (requires auth) */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const passkeys = await passkeyService.listPasskeys(req.user!.id);
    res.json({ passkeys });
  } catch (err) {
    next(err);
  }
}

/** PATCH /auth/passkey/:id — rename a passkey (requires auth) */
export async function rename(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) throw new AppError(400, 'name is required');

    const passkey = await passkeyService.renamePasskey(req.user!.id, req.params.id, name.trim());
    res.json({ passkey: { id: passkey.id, name: passkey.name } });
  } catch (err) {
    next(err);
  }
}

/** DELETE /auth/passkey/:id — delete a passkey (requires auth) */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await passkeyService.deletePasskey(req.user!.id, req.params.id);
    res.json({ message: 'Passkey deleted' });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { config } from '../config';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getAppleAuthUrl,
  handleAppleCallback,
  findOrCreateOAuthUser,
  storeOAuthState,
  consumeOAuthState,
} from '../services/oauth.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // 'lax' required for cross-origin OAuth redirects
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

/** GET /auth/google — redirect user to Google consent screen */
export async function googleRedirect(_req: Request, res: Response, next: NextFunction) {
  try {
    const state = randomUUID();
    await storeOAuthState(state);
    res.redirect(getGoogleAuthUrl(state));
  } catch (err) {
    next(err);
  }
}

/** GET /auth/google/callback — exchange code, create/find user, issue session */
export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      return res.redirect(`${config.appUrl}/login?error=${encodeURIComponent(error)}`);
    }

    if (!state || !(await consumeOAuthState(state))) {
      return res.redirect(`${config.appUrl}/login?error=invalid_state`);
    }

    if (!code) {
      return res.redirect(`${config.appUrl}/login?error=missing_code`);
    }

    const userInfo = await handleGoogleCallback(code);
    const result = await findOrCreateOAuthUser(
      'google',
      userInfo.providerAccountId,
      userInfo.email,
      userInfo.firstName,
      userInfo.lastName,
      userInfo.avatarUrl,
    );

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    res.redirect(`${config.appUrl}/auth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
}

/** GET /auth/apple — redirect user to Apple Sign In */
export async function appleRedirect(_req: Request, res: Response, next: NextFunction) {
  try {
    const state = randomUUID();
    await storeOAuthState(state);
    res.redirect(getAppleAuthUrl(state));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/apple/callback — Apple sends a form POST with code, id_token, state.
 * The optional `user` JSON string is only present on the very first sign-in.
 */
export async function appleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { id_token, state, error, user: userJson } = req.body as {
      id_token?: string;
      state?: string;
      error?: string;
      user?: string;
    };

    if (error) {
      return res.redirect(`${config.appUrl}/login?error=${encodeURIComponent(error)}`);
    }

    if (!state || !(await consumeOAuthState(state))) {
      return res.redirect(`${config.appUrl}/login?error=invalid_state`);
    }

    if (!id_token) {
      return res.redirect(`${config.appUrl}/login?error=missing_token`);
    }

    const appleInfo = await handleAppleCallback(id_token);

    // Apple only sends user name on first sign-in
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson) as { name?: { firstName?: string; lastName?: string } };
        firstName = parsed.name?.firstName;
        lastName = parsed.name?.lastName;
      } catch {
        // Ignore parse errors — name is optional
      }
    }

    const result = await findOrCreateOAuthUser(
      'apple',
      appleInfo.providerAccountId,
      appleInfo.email,
      firstName,
      lastName,
    );

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    res.redirect(`${config.appUrl}/auth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
}

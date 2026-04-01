import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { prisma } from '../config/database';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user } = await authService.registerUser(req.body);
    res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body.email, req.body.password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
      organizations: result.organizations,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    res.json({ accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) await authService.logoutUser(token);

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.requestPasswordReset(req.body.email);
    // Always return success to prevent email enumeration
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.verifyEmail(req.params.token);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });
    res.json({
      user,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
}

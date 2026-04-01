import { Router } from 'express';
import express from 'express';
import * as controller from '../controllers/auth.controller';
import * as oauthController from '../controllers/oauth.controller';
import * as passkeyController from '../controllers/passkey.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// ─── Email / Password ────────────────────────────────────────────────────────
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/logout', controller.logout);
router.post('/refresh', controller.refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
router.get('/verify-email/:token', controller.verifyEmail);
router.get('/me', authenticate, controller.me);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get('/google', oauthController.googleRedirect);
router.get('/google/callback', oauthController.googleCallback);

// ─── Apple Sign In ────────────────────────────────────────────────────────────
router.get('/apple', oauthController.appleRedirect);
// Apple sends a form POST; must parse urlencoded body for this route only
router.post('/apple/callback', express.urlencoded({ extended: true }), oauthController.appleCallback);

// ─── Passkeys (WebAuthn) ──────────────────────────────────────────────────────
// Public: challenge generation + verification
router.post('/passkey/authenticate/options', passkeyController.getAuthOptions);
router.post('/passkey/authenticate/verify', passkeyController.verifyAuthResponse);

// Authenticated: registration + management
router.post('/passkey/register/options', authenticate, passkeyController.getRegOptions);
router.post('/passkey/register/verify', authenticate, passkeyController.verifyRegResponse);
router.get('/passkey', authenticate, passkeyController.list);
router.patch('/passkey/:id', authenticate, passkeyController.rename);
router.delete('/passkey/:id', authenticate, passkeyController.remove);

export default router;

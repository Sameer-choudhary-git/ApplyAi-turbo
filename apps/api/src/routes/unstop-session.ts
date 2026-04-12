/**
 * server/routes/unstop-session.ts
 *
 * POST /api/sessions/unstop/request-setup   — web UI calls this (auth required)
 * GET  /api/sessions/unstop/status          — web UI polls this (auth required)
 * POST /api/sessions/unstop/submit          — script calls this (token-auth, no JWT)
 * PATCH /api/users/me/flags                 — toggle isUnstopInternshipEnabled
 */

import { Hono } from 'hono';
import crypto from 'crypto';
import { prisma } from '@applyai/db';
import { authMiddleware } from '../middleware/auth';
import { encrypt } from '@applyai/utils';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const unstopSessionRouter = new Hono();

/** 
 * POST /api/sessions/unstop/request-setup
 *
 * Called by the web UI (JWT-authenticated).
 * Returns { token, scriptCommand } — the UI shows scriptCommand to the user.
 */
unstopSessionRouter.post('/request-setup', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.unstop_setup_tokens.upsert({
    where: { userId },
    update: { token, expiresAt, used: false, createdAt: new Date() },
    create: { userId, token, expiresAt, used: false },
  });

  // Changed: return deepLink instead of scriptCommand
  return c.json({
    token,
    deepLink: `engibuddy://?token=${token}`,
  });
});
/**
 * GET /api/sessions/unstop/status
 *
 * Polled by the web UI every 3s.
 * Returns: { status: 'idle' | 'pending' | 'success' | 'expired' }
 */
unstopSessionRouter.get('/status', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const tokenRow = await prisma.unstop_setup_tokens.findUnique({
    where: { userId },
    select: { used: true, expiresAt: true },
  });

  if (tokenRow && !tokenRow.used) {
    if (tokenRow.expiresAt < new Date()) return c.json({ status: 'expired' });
    return c.json({ status: 'pending' });
  }

  const session = await prisma.user_platform_sessions.findUnique({
    where: { userId_platform: { userId, platform: 'unstop' } },
    select: { isActive: true, lastVerifiedAt: true, expiresAt: true },
  });

  if (session?.isActive) {
    return c.json({
      status: 'success',
      lastVerifiedAt: session.lastVerifiedAt,
      expiresAt: session.expiresAt,
    });
  }

  return c.json({ status: 'idle' });
});

/**
 * POST /api/sessions/unstop/submit
 *
 * Called by setup-unstop.js on the user's machine.
 * No JWT needed — setupToken is the proof of identity.
 *
 * Body: { setupToken: string, encryptedCookie: string }
 */
unstopSessionRouter.post('/submit', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.setupToken || !body?.storageState) {
    return c.json({ error: 'setupToken and storageState are required' }, 400);
  }

  const { setupToken, storageState } = body as {
    setupToken: string;
    storageState: any;
  };

  const tokenRow = await prisma.unstop_setup_tokens.findUnique({
    where: { token: setupToken },
    select: { userId: true, used: true, expiresAt: true },
  });

  if (!tokenRow)                       return c.json({ error: 'Invalid setup token' }, 401);
  if (tokenRow.used)                   return c.json({ error: 'Setup token already used' }, 401);
  if (tokenRow.expiresAt < new Date()) return c.json({ error: 'Setup token expired' }, 401);

  const { userId } = tokenRow;

  // Mark used immediately to prevent replay
  await prisma.unstop_setup_tokens.update({
    where: { token: setupToken },
    data: { used: true },
  });

  const encryptedCookie = encrypt(storageState); // In real life, encrypt this before storing!

  await prisma.user_platform_sessions.upsert({
    where: { userId_platform: { userId, platform: 'unstop' } },
    update: {
      encryptedCookie: encryptedCookie,
      isActive: true,
      lastVerifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    create: {
      userId,
      platform: 'unstop',
      encryptedCookie: encryptedCookie,
      isActive: true,
      lastVerifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`[unstop] ✅ Session saved for user ${userId}`);
  return c.json({ ok: true });
});

// ─── User flags router ────────────────────────────────────────────────────────
export const userFlagsRouter = new Hono();

/**
 * PATCH /api/users/me/flags
 * Body: { isUnstopInternshipEnabled?: boolean, isCommudleEventEnabled?: boolean }
 */
userFlagsRouter.patch('/', async (c) => {
  const userId = c.get('userId') as string;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

  const { isUnstopInternshipEnabled, isCommudleEventEnabled } = body;

  if (isUnstopInternshipEnabled === true) {
    const session = await prisma.user_platform_sessions.findUnique({
      where: { userId_platform: { userId, platform: 'unstop' } },
      select: { isActive: true },
    });
    if (!session?.isActive) {
      return c.json({ error: 'No active Unstop session. Run the setup script first.' }, 422);
    }
  }

  const data: Record<string, boolean> = {};
  if (typeof isUnstopInternshipEnabled === 'boolean') data.isUnstopInternshipEnabled = isUnstopInternshipEnabled;
  if (typeof isCommudleEventEnabled === 'boolean')    data.isCommudleEventEnabled = isCommudleEventEnabled;

  if (!Object.keys(data).length) return c.json({ error: 'No valid flags provided' }, 400);

  const updated = await prisma.users.update({
    where: { id: userId },
    data,
    select: { id: true, isUnstopInternshipEnabled: true, isCommudleEventEnabled: true },
  });

  return c.json(updated);
});

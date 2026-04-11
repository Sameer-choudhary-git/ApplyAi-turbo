/**
 * Unstop Session Routes — Hono
 * 
 * Routes:
 *   POST /api/sessions/unstop/setup   → launch Firefox, wait for login, save encrypted session
 *   GET  /api/sessions/unstop/status  → poll for current setup state
 *   PATCH /api/users/me/flags         → toggle isUnstopInternshipEnabled etc.
 * 
 * Fire-and-forget + polling pattern:
 *   POST /setup returns immediately after opening the browser.
 *   Frontend polls GET /status every ~3s until status === 'success' | 'error'.
 */

import { Hono } from 'hono';
import { firefox } from 'playwright';
import crypto from 'crypto';
import { prisma } from '@applyai/db';

// ─── Encryption (AES-256-GCM) ─────────────────────────────────────────────────
// Set COOKIE_ENCRYPTION_KEY in .env — 64 hex chars (32 bytes)
// Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

function getEncryptionKey() {
  const key = process.env.COOKIE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('COOKIE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 128-bit tag
  // Format: iv:authTag:ciphertext  (all hex, colon-separated)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedStr) {
  const key = getEncryptionKey();
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted string format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

// ─── In-memory state store ────────────────────────────────────────────────────
// Replace with Redis for multi-process / production deployments.
/**
 * @type {Map<string, {
 *   status: 'launching' | 'waiting' | 'saving' | 'success' | 'error',
 *   error?: string,
 *   updatedAt: number
 * }>}
 */
const sessionState = new Map();

function setState(userId, status, error) {
  sessionState.set(userId, {
    status,
    ...(error ? { error } : {}),
    updatedAt: Date.now(),
  });
}

// ─── Background Playwright task ───────────────────────────────────────────────
async function runUnstopSetup(userId) {
  let browser;
  try {
    setState(userId, 'launching');
    browser = await firefox.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://unstop.com/login');
    setState(userId, 'waiting');

    console.log(`[unstop] Waiting for user ${userId} to log in...`);

    // Wait up to 190s for the user to complete login
    await page.waitForURL('**/dashboard**', { timeout: 190_000 });

    console.log(`[unstop] Login detected for user ${userId}, saving session...`);
    setState(userId, 'saving');

    // Capture full storage state: cookies + localStorage + sessionStorage
    const storageState = await context.storageState();
    const encryptedCookie = encrypt(JSON.stringify(storageState));

    // Upsert into DB
    await prisma.user_platform_sessions.upsert({
      where: {
        userId_platform: { userId, platform: 'unstop' },
      },
      update: {
        encryptedCookie,
        isActive: true,
        lastVerifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30d
        updatedAt: new Date(),
      },
      create: {
        userId,
        platform: 'unstop',
        encryptedCookie,
        isActive: true,
        lastVerifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`[unstop] Session saved for user ${userId}`);
    setState(userId, 'success');

  } catch (err) {
    const isTimeout = err.message?.toLowerCase().includes('timeout');
    const errorMsg = isTimeout
      ? 'Login timed out (3 min). Please try again.'
      : `Setup failed: ${err.message}`;

    console.error(`[unstop] Error for user ${userId}:`, err.message);
    setState(userId, 'error', errorMsg);
  } finally {
    await browser?.close().catch(() => {});
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const unstopSessionRouter = new Hono();

/**
 * POST /api/sessions/unstop/setup
 *
 * Launches Firefox immediately and returns 200.
 * Frontend then polls /status.
 *
 * Requires: req.user.id set by auth middleware upstream.
 */
unstopSessionRouter.post('/setup', async (c) => {
  // Pull userId from your auth middleware context
  // e.g. using hono/jwt: const { sub: userId } = c.get('jwtPayload');
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const current = sessionState.get(userId);
  // Prevent double-launch if already in progress
  if (
    current &&
    ['launching', 'waiting', 'saving'].includes(current.status) &&
    Date.now() - current.updatedAt < 200_000 // 200s safety window
  ) {
    return c.json({ status: 'already_running', message: 'Setup already in progress' }, 409);
  }

  // Fire and forget — don't await
  runUnstopSetup(userId);

  return c.json({ status: 'launched' }, 200);
});

/**
 * GET /api/sessions/unstop/status
 *
 * Returns current setup status for the authenticated user.
 * Possible: launching | waiting | saving | success | error | idle
 */
unstopSessionRouter.get('/status', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const state = sessionState.get(userId);

  if (!state) {
    // Check if they already have an active session in DB
    const existing = await prisma.user_platform_sessions.findUnique({
      where: { userId_platform: { userId, platform: 'unstop' } },
      select: { isActive: true, lastVerifiedAt: true, expiresAt: true },
    });

    if (existing?.isActive) {
      return c.json({
        status: 'success',
        lastVerifiedAt: existing.lastVerifiedAt,
        expiresAt: existing.expiresAt,
      });
    }

    return c.json({ status: 'idle' });
  }

  return c.json(state);
});

// ─── User flags router ────────────────────────────────────────────────────────
export const userFlagsRouter = new Hono();

/**
 * PATCH /api/users/me/flags
 *
 * Body: { isUnstopInternshipEnabled?: boolean, isCommudleEventEnabled?: boolean }
 *
 * Guards enabling Unstop if no active session exists.
 */
userFlagsRouter.patch('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { isUnstopInternshipEnabled, isCommudleEventEnabled } = body;

  // Guard: can't enable Unstop without an active session
  if (isUnstopInternshipEnabled === true) {
    const session = await prisma.user_platform_sessions.findUnique({
      where: { userId_platform: { userId, platform: 'unstop' } },
      select: { isActive: true },
    });
    if (!session?.isActive) {
      return c.json(
        { error: 'No active Unstop session. Set up cookies first.' },
        422
      );
    }
  }

  const data = {};
  if (typeof isUnstopInternshipEnabled === 'boolean') data.isUnstopInternshipEnabled = isUnstopInternshipEnabled;
  if (typeof isCommudleEventEnabled === 'boolean') data.isCommudleEventEnabled = isCommudleEventEnabled;

  if (!Object.keys(data).length) {
    return c.json({ error: 'No valid flags provided' }, 400);
  }

  const updated = await prisma.users.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      isUnstopInternshipEnabled: true,
      isCommudleEventEnabled: true,
    },
  });

  return c.json(updated);
});


/**
 * ─── Wiring into your main Hono app ─────────────────────────────────────────
 *
 * // src/index.ts (or app.ts)
 * import { Hono } from 'hono';
 * import { unstopSessionRouter, userFlagsRouter } from './routes/unstop-session.js';
 * import { authMiddleware } from './middleware/auth.js';
 *
 * const app = new Hono();
 *
 * // Auth middleware sets c.set('userId', ...) for all protected routes
 * app.use('/api/*', authMiddleware);
 *
 * app.route('/api/sessions/unstop', unstopSessionRouter);
 * app.route('/api/users/me/flags', userFlagsRouter);
 *
 * export default app;
 *
 *
 * ─── Example auth middleware (JWT) ──────────────────────────────────────────
 *
 * import { jwt } from 'hono/jwt';
 *
 * export const authMiddleware = async (c, next) => {
 *   const payload = c.get('jwtPayload');   // set by hono/jwt
 *   if (!payload?.sub) return c.json({ error: 'Unauthorized' }, 401);
 *   c.set('userId', payload.sub);
 *   await next();
 * };
 *
 *
 * ─── Env vars needed ────────────────────────────────────────────────────────
 *
 * COOKIE_ENCRYPTION_KEY=<64 hex chars>
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 *
 * ─── Using the saved session in your scraper ────────────────────────────────
 *
 * import { firefox } from 'playwright';
 * import { PrismaClient } from '../generated/prisma/index.js';
 * import { decrypt } from './routes/unstop-session.js';
 *
 * const prisma = new PrismaClient();
 *
 * async function getUnstopContext(userId) {
 *   const row = await prisma.user_platform_sessions.findUnique({
 *     where: { userId_platform: { userId, platform: 'unstop' } },
 *   });
 *   if (!row?.isActive) throw new Error('No active Unstop session for user');
 *   const storageState = JSON.parse(decrypt(row.encryptedCookie));
 *   const browser = await firefox.launch({ headless: true });
 *   const context = await browser.newContext({ storageState });
 *   return { browser, context }; // fully logged-in 🎉
 * }
 */
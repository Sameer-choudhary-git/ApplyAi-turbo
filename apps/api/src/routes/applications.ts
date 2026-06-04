import { Hono } from 'hono';
import { prisma } from '@applyai/db';
import { authMiddleware } from '../middleware/auth';

export const applicationsRouter = new Hono();

// GET /api/applications
applicationsRouter.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const applications = await prisma.user_job_applications.findMany({
      where: { userId },
      orderBy: { appliedAt: 'desc' },
    });

    return c.json({ success: true, data: applications });
  } catch (err) {
    console.error('GET /api/applications error:', err);
    return c.json({ success: false, error: 'Failed to fetch applications' }, 500);
  }
});
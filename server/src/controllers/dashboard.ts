import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../services/supabase/database';

/**
 * GET /api/dashboard
 * Aggregates all Phase 7 student dashboard data strictly scoped to the authenticated user.
 */
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const data = await db.getDashboardData(req.user.id);
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      ...data,
    });
  } catch (error) {
    console.error('getDashboard controller error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
}

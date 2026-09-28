import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../services/supabase/database';

/**
 * GET /api/mastery
 * Retrieves concept mastery records for the authenticated user.
 * Optional query param: conceptId
 */
export async function getConceptMasteryController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const conceptId = typeof req.query.conceptId === 'string' ? req.query.conceptId : undefined;
    const mastery = await db.getConceptMastery(req.user.id, conceptId);

    res.json({
      success: true,
      mastery,
    });
  } catch (error: any) {
    console.error('getConceptMasteryController error:', error);
    res.status(500).json({ error: 'Failed to retrieve concept mastery' });
  }
}

/**
 * GET /api/revision-tasks
 * Retrieves targeted revision tasks for the authenticated user.
 * Optional query param: includeCompleted=true
 */
export async function getRevisionTasksController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const includeCompleted = req.query.includeCompleted === 'true';
    const tasks = await db.getRevisionTasks(req.user.id, includeCompleted);

    res.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    console.error('getRevisionTasksController error:', error);
    res.status(500).json({ error: 'Failed to retrieve revision tasks' });
  }
}

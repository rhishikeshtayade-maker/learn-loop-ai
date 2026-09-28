import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { getSupabaseAdmin } from '../services/supabase/supabaseAdmin';
import db from '../services/supabase/database';
import prisma from '../prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const AUTH_COOKIE_NAME = 'learnloop_auth_token';

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // Fallback to Bearer token in header
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    const sb = getSupabaseAdmin();
    if (sb) {
      // 1. Authenticate with Supabase Auth
      const { data: { user: sbUser }, error } = await sb.auth.getUser(token);
      if (!error && sbUser) {
        // Retrieve profile from database
        const profile = await db.getProfile(sbUser.id);
        req.user = {
          id: sbUser.id,
          email: sbUser.email || '',
          name: profile?.name || sbUser.user_metadata?.name || 'Student',
        };
        next();
        return;
      }
    }

    // 2. Fallback to JWT verification if Supabase Auth check token wasn't a Supabase session or running locally
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
      return;
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('requireAuth middleware error:', error);
    res.status(500).json({ error: 'Authentication verification failed.' });
  }
}

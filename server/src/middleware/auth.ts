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

    if (token) {
      token = token.trim();
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    // 1. Try Supabase Auth verification
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data?.user) {
          const sbUser = data.user;
          let userName = sbUser.user_metadata?.name || 'Student';

          try {
            const profile = await db.getProfile(sbUser.id);
            if (profile?.name) {
              userName = profile.name;
            }
          } catch (profileErr) {
            console.warn('Could not fetch user profile in requireAuth:', profileErr);
          }

          req.user = {
            id: sbUser.id,
            email: sbUser.email || '',
            name: userName,
          };

          return next();
        }
      } catch (sbErr) {
        console.warn('Supabase auth.getUser exception:', sbErr);
      }
    }

    // 2. Fallback to JWT verification (for local auth or local fallback tokens)
    try {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        let userName = 'Student';

        if (sb) {
          try {
            const profile = await db.getProfile(decoded.userId);
            if (profile?.name) userName = profile.name;
          } catch {}
        } else if (prisma) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: { id: true, email: true, name: true },
            });
            if (user) {
              req.user = user;
              return next();
            }
          } catch {}
        }

        req.user = {
          id: decoded.userId,
          email: decoded.email || '',
          name: userName,
        };
        return next();
      }
    } catch (jwtErr) {
      console.warn('JWT verification fallback failed:', jwtErr);
    }

    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  } catch (error) {
    console.error('requireAuth middleware error:', error);
    const message = error instanceof Error ? error.message : 'Authentication verification failed.';
    res.status(401).json({ error: message });
  }
}

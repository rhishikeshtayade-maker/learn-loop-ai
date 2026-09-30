import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { registerSchema, loginSchema } from '../schemas/auth';
import { generateToken } from '../utils/jwt';
import { AuthRequest, AUTH_COOKIE_NAME } from '../middleware/auth';
import config from '../config';
import { getSupabaseAdmin } from '../services/supabase/supabaseAdmin';
import db from '../services/supabase/database';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data';
      res.status(400).json({ error: firstError });
      return;
    }

    const { name, email, password } = parseResult.data;

    const sb = getSupabaseAdmin();
    if (sb) {
      // 1. Supabase Auth Registration
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true,
      });

      if (error || !data?.user) {
        if (error?.message?.toLowerCase().includes('already registered')) {
          res.status(409).json({ error: 'An account with this email address already exists.' });
          return;
        }
        res.status(400).json({ error: error?.message || 'Registration failed' });
        return;
      }

      const user = data.user;
      
      // Ensure profile exists in public.profiles table
      await sb.from('profiles').upsert({
        id: user.id,
        name,
        updated_at: new Date().toISOString(),
      });

      // Sign in to get session token
      const { data: sessionData } = await sb.auth.signInWithPassword({ email, password });
      const token = sessionData.session?.access_token || generateToken({ userId: user.id, email: user.email! });

      res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

      res.status(201).json({
        message: 'Account created successfully',
        user: {
          id: user.id,
          name,
          email: user.email,
          createdAt: user.created_at,
        },
        token,
      });
      return;
    }

    // 2. Fallback to Local Auth (Prisma)
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register account. Please try again.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid credentials';
      res.status(400).json({ error: firstError });
      return;
    }

    const { email, password } = parseResult.data;

    const sb = getSupabaseAdmin();
    if (sb) {
      // 1. Supabase Auth Login
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error || !data?.user || !data?.session) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const user = data.user;
      const profile = await db.getProfile(user.id);
      const token = data.session.access_token;

      res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

      res.json({
        message: 'Logged in successfully',
        user: {
          id: user.id,
          name: profile?.name || user.user_metadata?.name || 'Student',
          email: user.email,
          createdAt: user.created_at,
        },
        token,
      });
      return;
    }

    // 2. Fallback Local Auth (Prisma)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

    res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in. Please try again.' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const profile = await db.getProfile(req.user.id);

    res.json({
      user: {
        id: req.user.id,
        name: profile?.name || req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch current user session' });
  }
}

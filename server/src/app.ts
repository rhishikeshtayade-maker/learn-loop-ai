import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import config from './config';
import prisma from './prisma';
import authRoutes from './routes/auth';
import lectureRoutes from './routes/lecture';
import quizAttemptRoutes from './routes/quizAttempt';
import masteryRoutes from './routes/mastery';
import revisionTaskRoutes from './routes/revisionTask';
import dashboardRoutes from './routes/dashboard';
import { requireAuth, AuthRequest } from './middleware/auth';
import { getSupabaseAdmin } from './services/supabase/supabaseAdmin';

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server, same-origin)
    if (!origin) return callback(null, true);
    if (
      origin === config.clientUrl ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', async (_req: Request, res: Response) => {
  const sb = getSupabaseAdmin();
  if (sb) {
    let userCount = 0;
    try {
      const { count } = await sb.from('User').select('*', { count: 'exact', head: true });
      userCount = count || 0;
    } catch {
      userCount = 0;
    }

    return res.json({
      status: 'ok',
      service: 'LearnLoop AI API',
      database: 'supabase',
      stats: { users: userCount },
      geminiConfigured: !!config.geminiApiKey,
      envCheck: {
        hasSupabaseUrl: !!config.supabaseUrl,
        hasServiceKey: !!config.supabaseServiceRoleKey,
        keyLength: config.supabaseServiceRoleKey.length,
      },
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    status: 'degraded',
    service: 'LearnLoop AI API',
    database: 'disconnected',
    envCheck: {
      hasSupabaseUrl: !!config.supabaseUrl,
      hasServiceKey: !!config.supabaseServiceRoleKey,
      supabaseKeysFound: Object.keys(process.env).filter((k) => k.toUpperCase().includes('SUPABASE')),
      allEnvKeys: Object.keys(process.env).filter((k) => !k.includes('SECRET') && !k.includes('PRIVATE')),
    },
    error: 'Supabase client is not initialized',
    geminiConfigured: !!config.geminiApiKey,
    timestamp: new Date().toISOString(),
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Lecture Routes
app.use('/api/lectures', lectureRoutes);

// Quiz Attempt Routes
app.use('/api/quiz-attempts', quizAttemptRoutes);

// Mastery & Revision Task Routes (Phase 6)
app.use('/api/mastery', masteryRoutes);
app.use('/api/revision-tasks', revisionTaskRoutes);

// Dashboard Route (Phase 7)
app.use('/api/dashboard', dashboardRoutes);

// Protected Test Route to verify authorization
app.get('/api/protected/test', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({
    message: 'Authorized access granted',
    user: req.user,
  });
});

// 404 Handler for API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve frontend static assets in production (Render unified deployment)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export { app };
export default app;

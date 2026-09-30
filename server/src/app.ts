import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', async (_req: Request, res: Response) => {
  const sb = getSupabaseAdmin();
  if (sb) {
    return res.json({
      status: 'ok',
      service: 'LearnLoop AI API',
      database: 'supabase',
      geminiConfigured: !!config.geminiApiKey,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Verify DB connectivity via Prisma fallback
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    const lectureCount = await prisma.lecture.count();

    res.json({
      status: 'ok',
      service: 'LearnLoop AI API',
      database: 'connected',
      stats: {
        users: userCount,
        lectures: lectureCount,
      },
      geminiConfigured: !!config.geminiApiKey,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check database query failed:', error);
    res.status(500).json({
      status: 'degraded',
      service: 'LearnLoop AI API',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    });
  }
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

// 404 Handler
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export { app };
export default app;

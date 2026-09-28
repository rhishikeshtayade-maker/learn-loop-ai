import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config';
import prisma from './prisma';
import authRoutes from './routes/auth';
import lectureRoutes from './routes/lecture';
import quizAttemptRoutes from './routes/quizAttempt';
import { requireAuth, AuthRequest } from './middleware/auth';

const app = express();

// Middleware
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Verify DB connectivity
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

// Start Server
const server = app.listen(config.port, () => {
  console.log(`🚀 LearnLoop AI Server running at http://localhost:${config.port}`);
  console.log(`📡 Health Check available at http://localhost:${config.port}/api/health`);
  console.log(`🤖 Gemini API Key configured: ${!!config.geminiApiKey ? 'Yes' : 'No (Offline Fallback Engine Ready)'}`);
});

export { app, server };

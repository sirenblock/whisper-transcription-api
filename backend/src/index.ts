/**
 * @module WhisperAPI
 * @description Main Express server for Whisper Transcription API
 *
 * @requires express
 * @requires cors
 * @requires helmet
 * @requires dotenv
 * @requires ./routes
 * @requires ./routes/webhook.routes
 *
 * @example
 * npm run dev
 * # Server starts on PORT from .env (default 3000)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes';
import webhookRoutes from './routes/webhook.routes';
import { prisma } from './db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production',
  crossOriginEmbedderPolicy: NODE_ENV === 'production',
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3001',
    'http://localhost:3002',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Trust proxy (required for Railway, etc.)
app.set('trust proxy', 1);

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

// Webhook routes need raw body for signature verification
app.use('/webhooks', webhookRoutes);

// JSON body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// REQUEST LOGGING (Development)
// ============================================

if (NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'server',
      message: 'Incoming request',
      data: {
        method: req.method,
        path: req.path,
        ip: req.ip,
      }
    }));
    next();
  });
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

/**
 * GET /health - Basic health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/db - Database health check
 */
app.get('/health/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      database: 'disconnected',
      error: 'Database connection failed',
    });
  }
});

/**
 * GET /health/ready - Readiness probe
 */
app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis (via queue service)
    // This would be implemented in queue.service.ts
    // const redisHealthy = await checkRedisHealth();

    res.json({
      success: true,
      ready: true,
      checks: {
        database: 'ok',
        // redis: redisHealthy ? 'ok' : 'degraded',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      ready: false,
      error: 'Service not ready',
    });
  }
});

// ============================================
// API ROUTES
// ============================================

app.use('/api', routes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    module: 'server',
    message: 'Unhandled error',
    data: {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    }
  }));

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors,
      },
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }

  // Default 500 error
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal: string) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'server',
    message: `Received ${signal}, shutting down gracefully`,
  }));

  // Close database connections
  await prisma.$disconnect();

  // Close server
  server.close(() => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'server',
      message: 'Server closed',
    }));
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'server',
      message: 'Forced shutdown after timeout',
    }));
    process.exit(1);
  }, 10000);
};

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'server',
    message: 'Server started',
    data: {
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
    }
  }));

  if (NODE_ENV === 'development') {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API docs: http://localhost:${PORT}/api/version`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    module: 'server',
    message: 'Uncaught exception',
    data: {
      error: error.message,
      stack: error.stack,
    }
  }));
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    module: 'server',
    message: 'Unhandled rejection',
    data: {
      reason,
      promise,
    }
  }));
});

export default app;

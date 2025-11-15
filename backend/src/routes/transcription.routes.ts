/**
 * @module TranscriptionRoutes
 * @description Express routes for transcription operations (upload, status, download, list)
 *
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../middleware/rateLimit.middleware
 * @requires ../services/s3.service
 * @requires ../services/queue.service
 * @requires ../db
 * @requires zod
 *
 * @example
 * import transcriptionRoutes from './routes/transcription.routes';
 * app.use('/api/v1', transcriptionRoutes);
 *
 * @exports {Router} default - Express router with transcription endpoints
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { generateUploadUrl, getDownloadUrl } from '../services/s3.service';
import { addTranscriptionJob, getJobStatus } from '../services/queue.service';
import { prisma } from '../db';

const router = express.Router();

// Validation schemas
const TranscribeRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(audio|video)\//),
  model: z.enum(['BASE', 'SMALL', 'MEDIUM']).optional().default('BASE'),
  format: z.enum(['JSON', 'SRT', 'VTT', 'TXT']).optional().default('JSON'),
});

const ListQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional().default('50'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
  status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
});

/**
 * POST /api/v1/transcribe - Initiate transcription
 *
 * @route POST /api/v1/transcribe
 * @auth Required - API key via Bearer token
 * @ratelimit Applied per user plan
 *
 * @body {string} filename - Name of the audio file
 * @body {string} contentType - MIME type (audio/* or video/*)
 * @body {string} [model=BASE] - Whisper model (BASE, SMALL, MEDIUM)
 * @body {string} [format=JSON] - Output format (JSON, SRT, VTT, TXT)
 *
 * @returns {object} 200 - Upload URL and transcription ID
 * @returns {object} 400 - Validation error
 * @returns {object} 429 - Rate limit exceeded
 * @returns {object} 500 - Server error
 */
router.post('/transcribe', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validationResult = TranscribeRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        module: 'transcription-routes',
        message: 'Invalid transcribe request',
        data: {
          userId: req.user?.id,
          errors: validationResult.error.errors
        }
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
      });
    }

    const { filename, contentType, model, format } = validationResult.data;

    // Generate S3 upload URL
    const { uploadUrl, s3Key } = await generateUploadUrl(
      req.user!.id,
      filename,
      contentType
    );

    // Create transcription record
    const transcription = await prisma.transcription.create({
      data: {
        userId: req.user!.id,
        filename,
        model,
        format,
        status: 'QUEUED',
        s3AudioUrl: s3Key,
      },
    });

    // Queue transcription job
    await addTranscriptionJob({
      transcriptionId: transcription.id,
      userId: req.user!.id,
      s3AudioUrl: s3Key,
      model,
      format,
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'transcription-routes',
      message: 'Transcription initiated',
      data: {
        transcriptionId: transcription.id,
        userId: req.user!.id,
        filename,
        model,
        duration: Date.now() - startTime,
      }
    }));

    res.json({
      success: true,
      data: {
        transcriptionId: transcription.id,
        uploadUrl,
        statusUrl: `/api/v1/status/${transcription.id}`,
        expiresIn: 3600, // Upload URL expires in 1 hour
      },
      message: 'Upload URL generated. Upload your file to the provided URL.',
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'transcription-routes',
      message: 'Transcribe endpoint error',
      data: {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSCRIPTION_FAILED',
        message: 'Failed to initiate transcription',
      },
    });
  }
});

/**
 * GET /api/v1/status/:id - Check transcription status
 *
 * @route GET /api/v1/status/:id
 * @auth Required - API key via Bearer token
 *
 * @param {string} id - Transcription ID
 *
 * @returns {object} 200 - Transcription status and details
 * @returns {object} 404 - Transcription not found
 * @returns {object} 500 - Server error
 */
router.get('/status/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSCRIPTION_NOT_FOUND',
          message: 'Transcription not found or access denied',
        },
      });
    }

    // Get job status from queue if still processing
    let queueStatus = null;
    if (transcription.jobId && transcription.status === 'PROCESSING') {
      try {
        queueStatus = await getJobStatus(transcription.jobId);
      } catch (err) {
        // Job might not be in queue anymore, use database status
        console.warn('Could not fetch queue status, using database status');
      }
    }

    // Generate download URL if completed
    let downloadUrl = null;
    if (transcription.status === 'COMPLETED' && transcription.s3ResultUrl) {
      downloadUrl = await getDownloadUrl(transcription.s3ResultUrl);
    }

    res.json({
      success: true,
      data: {
        id: transcription.id,
        status: transcription.status,
        progress: queueStatus?.progress || transcription.progress,
        filename: transcription.filename,
        model: transcription.model,
        format: transcription.format,
        durationSeconds: transcription.durationSeconds,
        createdAt: transcription.createdAt,
        completedAt: transcription.completedAt,
        downloadUrl,
        errorMessage: transcription.errorMessage,
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'transcription-routes',
      message: 'Status endpoint error',
      data: {
        transcriptionId: req.params.id,
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch transcription status',
      },
    });
  }
});

/**
 * GET /api/v1/transcriptions - List user's transcriptions
 *
 * @route GET /api/v1/transcriptions
 * @auth Required - API key via Bearer token
 *
 * @query {number} [limit=50] - Number of results (max 100)
 * @query {number} [offset=0] - Pagination offset
 * @query {string} [status] - Filter by status
 *
 * @returns {object} 200 - List of transcriptions
 * @returns {object} 400 - Invalid query parameters
 * @returns {object} 500 - Server error
 */
router.get('/transcriptions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validationResult = ListQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
      });
    }

    const limit = Math.min(parseInt(validationResult.data.limit), 100);
    const offset = parseInt(validationResult.data.offset);
    const status = validationResult.data.status;

    const where: any = { userId: req.user!.id };
    if (status) {
      where.status = status;
    }

    const [transcriptions, total] = await Promise.all([
      prisma.transcription.findMany({
        where,
        select: {
          id: true,
          filename: true,
          model: true,
          format: true,
          status: true,
          durationSeconds: true,
          progress: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transcription.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transcriptions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'transcription-routes',
      message: 'List transcriptions error',
      data: {
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch transcriptions',
      },
    });
  }
});

/**
 * GET /api/v1/download/:id - Download transcription result
 *
 * @route GET /api/v1/download/:id
 * @auth Required - API key via Bearer token
 *
 * @param {string} id - Transcription ID
 *
 * @returns {object} 200 - Download URL
 * @returns {object} 404 - Transcription not found or not completed
 * @returns {object} 500 - Server error
 */
router.get('/download/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSCRIPTION_NOT_FOUND',
          message: 'Transcription not found or access denied',
        },
      });
    }

    if (transcription.status !== 'COMPLETED' || !transcription.s3ResultUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TRANSCRIPTION_NOT_READY',
          message: `Transcription is not ready for download (status: ${transcription.status})`,
        },
      });
    }

    const downloadUrl = await getDownloadUrl(transcription.s3ResultUrl);

    res.json({
      success: true,
      data: {
        downloadUrl,
        filename: transcription.filename,
        format: transcription.format,
        expiresIn: 3600, // Download URL expires in 1 hour
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'transcription-routes',
      message: 'Download endpoint error',
      data: {
        transcriptionId: req.params.id,
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate download URL',
      },
    });
  }
});

/**
 * GET /api/v1/usage - Get user's usage statistics
 *
 * @route GET /api/v1/usage
 * @auth Required - API key via Bearer token
 *
 * @returns {object} 200 - Usage statistics
 * @returns {object} 500 - Server error
 */
router.get('/usage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        plan: true,
        monthlyMinutesUsed: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Get quota based on plan
    const quotas: Record<string, number> = {
      FREE: parseInt(process.env.QUOTA_FREE || '60'),
      PRO: parseInt(process.env.QUOTA_PRO || '600'),
      PAYG: Infinity,
    };

    const quota = quotas[user.plan] || 0;
    const remaining = quota === Infinity ? Infinity : Math.max(0, quota - user.monthlyMinutesUsed);

    // Get this month's transcription count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyTranscriptionCount = await prisma.transcription.count({
      where: {
        userId: req.user!.id,
        createdAt: { gte: startOfMonth },
      },
    });

    res.json({
      success: true,
      data: {
        plan: user.plan,
        minutesUsed: user.monthlyMinutesUsed,
        quota: quota === Infinity ? 'unlimited' : quota,
        remaining: remaining === Infinity ? 'unlimited' : remaining,
        percentageUsed: quota === Infinity ? 0 : Math.round((user.monthlyMinutesUsed / quota) * 100),
        transcriptionsThisMonth: monthlyTranscriptionCount,
        memberSince: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'transcription-routes',
      message: 'Usage endpoint error',
      data: {
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch usage statistics',
      },
    });
  }
});

export default router;

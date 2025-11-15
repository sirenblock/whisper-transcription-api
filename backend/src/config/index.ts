/**
 * @module Configuration
 * @description Centralized configuration manager with worker mode toggle support
 *
 * @requires dotenv
 * @requires ./validate
 *
 * @example
 * import config from './config';
 * console.log(config.worker.mode); // 'local' or 'cloud'
 *
 * @exports {Object} config - Complete application configuration
 */

import dotenv from 'dotenv';
import { validateConfig } from './validate';

// Load environment variables
dotenv.config();

/**
 * Application configuration object
 * Centralized source of truth for all environment-based settings
 */
export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // S3 / Cloudflare R2 Configuration
  s3: {
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
    endpoint: process.env.S3_ENDPOINT, // Optional - for R2 compatibility
  },

  // Worker Configuration - KEY TOGGLE POINT
  worker: {
    mode: (process.env.WORKER_MODE || 'local') as 'local' | 'cloud',
    localUrl: process.env.LOCAL_WORKER_URL,
    cloudUrl: process.env.CLOUD_WORKER_URL,

    // Get active worker URL based on mode
    get activeUrl(): string | undefined {
      return this.mode === 'local' ? this.localUrl : this.cloudUrl;
    },

    // Check if worker is configured
    get isConfigured(): boolean {
      return this.mode === 'local'
        ? !!this.localUrl
        : !!this.cloudUrl;
    }
  },

  // Stripe Payment Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    priceIdPro: process.env.STRIPE_PRICE_ID_PRO!,
  },

  // API Key Configuration
  apiKey: {
    prefix: process.env.API_KEY_PREFIX || 'wtr_live_',
    length: parseInt(process.env.API_KEY_LENGTH || '32', 10),
  },

  // Rate Limiting (requests per hour)
  rateLimit: {
    free: parseInt(process.env.RATE_LIMIT_FREE || '3', 10),
    pro: parseInt(process.env.RATE_LIMIT_PRO || '20', 10),
    payg: parseInt(process.env.RATE_LIMIT_PAYG || '100', 10),

    // Get rate limit for specific plan
    getLimit(plan: 'FREE' | 'PRO' | 'PAYG'): number {
      return this[plan.toLowerCase() as 'free' | 'pro' | 'payg'];
    }
  },

  // Monthly Quotas (minutes)
  quota: {
    free: parseInt(process.env.QUOTA_FREE || '60', 10),
    pro: parseInt(process.env.QUOTA_PRO || '600', 10),
    payg: Infinity, // Pay-as-you-go has no limit

    // Get quota for specific plan
    getQuota(plan: 'FREE' | 'PRO' | 'PAYG'): number {
      if (plan === 'PAYG') return Infinity;
      return this[plan.toLowerCase() as 'free' | 'pro'];
    }
  },

  // File Upload Configuration
  file: {
    maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10),
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10) * 1024 * 1024,
    allowedFormats: (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,mp4,mpeg,webm').split(','),
    retentionHours: parseInt(process.env.FILE_RETENTION_HOURS || '24', 10),

    // Check if format is allowed
    isFormatAllowed(format: string): boolean {
      return this.allowedFormats.includes(format.toLowerCase());
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
} as const;

// Validate configuration on module load
// This ensures the application fails fast if misconfigured
if (!config.isTest) {
  validateConfig(config);
}

export default config;

// Type exports for TypeScript consumers
export type Config = typeof config;
export type WorkerMode = 'local' | 'cloud';
export type Plan = 'FREE' | 'PRO' | 'PAYG';

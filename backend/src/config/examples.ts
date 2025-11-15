/**
 * @module ConfigExamples
 * @description Usage examples for the configuration module
 *
 * This file demonstrates various ways to use the configuration system.
 * These examples can be used as reference when integrating config into other modules.
 */

import config from './index';
import type { Plan, WorkerMode } from './index';

// ============================================================================
// EXAMPLE 1: Basic Configuration Access
// ============================================================================

export function example1_BasicAccess() {
  console.log('=== Example 1: Basic Configuration Access ===');

  // Access server configuration
  console.log(`Server running on port: ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Access database configuration
  console.log(`Database URL: ${config.databaseUrl.substring(0, 20)}...`);

  // Access S3 configuration
  console.log(`S3 Bucket: ${config.s3.bucket}`);
  console.log(`S3 Region: ${config.s3.region}`);

  // Access worker configuration
  console.log(`Worker Mode: ${config.worker.mode}`);
  console.log(`Active Worker URL: ${config.worker.activeUrl}`);
}

// ============================================================================
// EXAMPLE 2: Worker Mode Toggle
// ============================================================================

export function example2_WorkerMode() {
  console.log('=== Example 2: Worker Mode Usage ===');

  // Get active worker URL based on mode
  const workerUrl = config.worker.activeUrl;
  console.log(`Sending job to: ${workerUrl}`);

  // Check if worker is configured
  if (!config.worker.isConfigured) {
    console.warn('Warning: Worker is not configured!');
    return;
  }

  // Example: Send transcription job to worker
  async function sendToWorker(jobData: any) {
    const response = await fetch(`${workerUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    });
    return response.json();
  }

  // Worker mode automatically determines destination:
  // - If WORKER_MODE=local → sends to LOCAL_WORKER_URL
  // - If WORKER_MODE=cloud → sends to CLOUD_WORKER_URL
}

// ============================================================================
// EXAMPLE 3: Rate Limiting
// ============================================================================

export function example3_RateLimiting() {
  console.log('=== Example 3: Rate Limiting ===');

  // Get rate limit for each plan
  const plans: Plan[] = ['FREE', 'PRO', 'PAYG'];

  plans.forEach(plan => {
    const limit = config.rateLimit.getLimit(plan);
    console.log(`${plan} plan: ${limit} requests/hour`);
  });

  // Example: Check if user can make request
  function canMakeRequest(userPlan: Plan, requestsMade: number): boolean {
    const limit = config.rateLimit.getLimit(userPlan);
    return requestsMade < limit;
  }

  // Usage
  const userPlan: Plan = 'FREE';
  const requestsMade = 2;

  if (canMakeRequest(userPlan, requestsMade)) {
    console.log('Request allowed');
  } else {
    console.log('Rate limit exceeded');
  }
}

// ============================================================================
// EXAMPLE 4: Quota Management
// ============================================================================

export function example4_QuotaManagement() {
  console.log('=== Example 4: Quota Management ===');

  // Get monthly quota for each plan
  const freeQuota = config.quota.getQuota('FREE');
  const proQuota = config.quota.getQuota('PRO');
  const paygQuota = config.quota.getQuota('PAYG');

  console.log(`FREE plan: ${freeQuota} minutes/month`);
  console.log(`PRO plan: ${proQuota} minutes/month`);
  console.log(`PAYG plan: ${paygQuota === Infinity ? 'Unlimited' : paygQuota}`);

  // Example: Check if user has quota remaining
  function checkQuota(userPlan: Plan, minutesUsed: number, requestedMinutes: number): {
    allowed: boolean;
    remaining: number;
  } {
    const quota = config.quota.getQuota(userPlan);

    if (quota === Infinity) {
      return { allowed: true, remaining: Infinity };
    }

    const remaining = quota - minutesUsed;
    const allowed = remaining >= requestedMinutes;

    return { allowed, remaining };
  }

  // Usage
  const result = checkQuota('PRO', 550, 60);
  console.log(`Can process: ${result.allowed}`);
  console.log(`Minutes remaining: ${result.remaining}`);
}

// ============================================================================
// EXAMPLE 5: File Validation
// ============================================================================

export function example5_FileValidation() {
  console.log('=== Example 5: File Validation ===');

  // Check allowed formats
  const allowedFormats = config.file.allowedFormats;
  console.log(`Allowed formats: ${allowedFormats.join(', ')}`);

  // Check max file size
  console.log(`Max file size: ${config.file.maxSizeMB}MB`);
  console.log(`Max file size (bytes): ${config.file.maxSizeBytes}`);

  // Example: Validate uploaded file
  interface UploadedFile {
    originalname: string;
    size: number;
  }

  function validateFile(file: UploadedFile): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > config.file.maxSizeBytes) {
      return {
        valid: false,
        error: `File exceeds ${config.file.maxSizeMB}MB limit`,
      };
    }

    // Check file format
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!config.file.isFormatAllowed(ext)) {
      return {
        valid: false,
        error: `Format .${ext} not allowed. Allowed: ${allowedFormats.join(', ')}`,
      };
    }

    return { valid: true };
  }

  // Usage
  const testFile: UploadedFile = {
    originalname: 'audio.mp3',
    size: 50 * 1024 * 1024, // 50MB
  };

  const validation = validateFile(testFile);
  if (validation.valid) {
    console.log('File is valid');
  } else {
    console.log(`Validation error: ${validation.error}`);
  }
}

// ============================================================================
// EXAMPLE 6: Environment-Based Logic
// ============================================================================

export function example6_EnvironmentLogic() {
  console.log('=== Example 6: Environment-Based Logic ===');

  // Check environment
  if (config.isDevelopment) {
    console.log('Running in DEVELOPMENT mode');
    // Enable debug features
    // Use relaxed security
    // Enable verbose logging
  }

  if (config.isProduction) {
    console.log('Running in PRODUCTION mode');
    // Enable strict security
    // Disable debug features
    // Enable monitoring
  }

  if (config.isTest) {
    console.log('Running in TEST mode');
    // Use test database
    // Mock external services
    // Disable rate limiting
  }

  // Example: Conditional feature flags
  const features = {
    debugMode: config.isDevelopment,
    strictValidation: config.isProduction,
    mockServices: config.isTest,
    localWorker: config.worker.mode === 'local',
    cloudWorker: config.worker.mode === 'cloud',
  };

  console.log('Feature flags:', features);
}

// ============================================================================
// EXAMPLE 7: API Key Generation
// ============================================================================

export function example7_ApiKeyGeneration() {
  console.log('=== Example 7: API Key Configuration ===');

  // Get API key settings
  console.log(`API Key Prefix: ${config.apiKey.prefix}`);
  console.log(`API Key Length: ${config.apiKey.length}`);

  // Example: Generate API key with configured prefix
  function generateApiKey(): string {
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(config.apiKey.length / 2);
    const randomPart = randomBytes.toString('hex');
    return `${config.apiKey.prefix}${randomPart}`;
  }

  // Usage
  const newKey = generateApiKey();
  console.log(`Generated key: ${newKey}`);
  // Output: wtr_live_a3f9d2c1e8b7f4a0c9d8e3b2f1a0c9d8
}

// ============================================================================
// EXAMPLE 8: Stripe Integration
// ============================================================================

export function example8_StripeConfig() {
  console.log('=== Example 8: Stripe Configuration ===');

  // Access Stripe configuration
  console.log(`Stripe key type: ${config.stripe.secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`);
  console.log(`Pro plan price ID: ${config.stripe.priceIdPro}`);

  // Example: Initialize Stripe client
  async function initializeStripe() {
    const Stripe = require('stripe');
    const stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    });
    return stripe;
  }

  // Example: Verify webhook signature
  function verifyWebhook(rawBody: Buffer, signature: string) {
    const Stripe = require('stripe');
    const stripe = new Stripe(config.stripe.secretKey);

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.stripe.webhookSecret
      );
      return { verified: true, event };
    } catch (error) {
      return { verified: false, error };
    }
  }
}

// ============================================================================
// EXAMPLE 9: S3 Client Initialization
// ============================================================================

export function example9_S3Config() {
  console.log('=== Example 9: S3 Configuration ===');

  // Example: Initialize S3 client with config
  async function initializeS3Client() {
    const { S3Client } = require('@aws-sdk/client-s3');

    const clientConfig: any = {
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
    };

    // Add custom endpoint if using Cloudflare R2
    if (config.s3.endpoint) {
      clientConfig.endpoint = config.s3.endpoint;
      console.log('Using custom S3 endpoint (Cloudflare R2)');
    }

    const s3Client = new S3Client(clientConfig);
    return s3Client;
  }

  console.log(`S3 Bucket: ${config.s3.bucket}`);
  console.log(`S3 Region: ${config.s3.region}`);
  console.log(`Custom endpoint: ${config.s3.endpoint || 'None (using AWS S3)'}`);
}

// ============================================================================
// EXAMPLE 10: Redis Connection
// ============================================================================

export function example10_RedisConfig() {
  console.log('=== Example 10: Redis Configuration ===');

  console.log(`Redis URL: ${config.redisUrl}`);

  // Example: Initialize Redis client
  async function initializeRedis() {
    const Redis = require('ioredis');
    const redis = new Redis(config.redisUrl);

    redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    redis.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });

    return redis;
  }

  // Example: Initialize BullMQ queue
  async function initializeQueue() {
    const { Queue } = require('bullmq');

    const queue = new Queue('transcription', {
      connection: config.redisUrl,
    });

    return queue;
  }
}

// ============================================================================
// EXAMPLE 11: Complete Request Validation Flow
// ============================================================================

export function example11_CompleteValidation() {
  console.log('=== Example 11: Complete Validation Flow ===');

  interface TranscriptionRequest {
    file: {
      originalname: string;
      size: number;
    };
    user: {
      plan: Plan;
      monthlyMinutesUsed: number;
      requestsThisHour: number;
    };
    estimatedMinutes: number;
  }

  function validateTranscriptionRequest(req: TranscriptionRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 1. Validate file size
    if (req.file.size > config.file.maxSizeBytes) {
      errors.push(`File exceeds ${config.file.maxSizeMB}MB limit`);
    }

    // 2. Validate file format
    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!config.file.isFormatAllowed(ext)) {
      errors.push(`Format .${ext} not allowed`);
    }

    // 3. Check rate limit
    const rateLimit = config.rateLimit.getLimit(req.user.plan);
    if (req.user.requestsThisHour >= rateLimit) {
      errors.push(`Rate limit exceeded: ${rateLimit} requests/hour`);
    }

    // 4. Check quota
    const quota = config.quota.getQuota(req.user.plan);
    if (quota !== Infinity) {
      const remaining = quota - req.user.monthlyMinutesUsed;
      if (remaining < req.estimatedMinutes) {
        errors.push(`Quota exceeded: ${remaining} minutes remaining`);
      }
    }

    // 5. Check worker is configured
    if (!config.worker.isConfigured) {
      errors.push('Worker not configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Usage example
  const request: TranscriptionRequest = {
    file: {
      originalname: 'podcast.mp3',
      size: 25 * 1024 * 1024, // 25MB
    },
    user: {
      plan: 'FREE',
      monthlyMinutesUsed: 45,
      requestsThisHour: 2,
    },
    estimatedMinutes: 20,
  };

  const validation = validateTranscriptionRequest(request);
  if (validation.valid) {
    console.log('✓ Request is valid');
  } else {
    console.log('✗ Validation errors:');
    validation.errors.forEach(err => console.log(`  - ${err}`));
  }
}

// ============================================================================
// Run all examples (for demonstration)
// ============================================================================

if (require.main === module) {
  console.log('\n🚀 Configuration Module Examples\n');

  example1_BasicAccess();
  console.log();

  example2_WorkerMode();
  console.log();

  example3_RateLimiting();
  console.log();

  example4_QuotaManagement();
  console.log();

  example5_FileValidation();
  console.log();

  example6_EnvironmentLogic();
  console.log();

  example7_ApiKeyGeneration();
  console.log();

  example8_StripeConfig();
  console.log();

  example9_S3Config();
  console.log();

  example10_RedisConfig();
  console.log();

  example11_CompleteValidation();
  console.log();

  console.log('✓ All examples completed\n');
}

export default {
  example1_BasicAccess,
  example2_WorkerMode,
  example3_RateLimiting,
  example4_QuotaManagement,
  example5_FileValidation,
  example6_EnvironmentLogic,
  example7_ApiKeyGeneration,
  example8_StripeConfig,
  example9_S3Config,
  example10_RedisConfig,
  example11_CompleteValidation,
};

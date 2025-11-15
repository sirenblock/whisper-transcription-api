/**
 * @module ConfigTests
 * @description Unit tests for configuration module
 */

import { validateConfig, validateWorkerConfig } from '../validate';

describe('Configuration Module', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('config object', () => {
    it('should load configuration with defaults', () => {
      // Set minimal required env vars
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      // Dynamically import to get fresh config
      const { config } = require('../index');

      expect(config.port).toBe(3000);
      expect(config.nodeEnv).toBe('test');
      expect(config.worker.mode).toBe('local');
      expect(config.apiKey.prefix).toBe('wtr_live_');
    });

    it('should override defaults with environment variables', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '4000';
      process.env.WORKER_MODE = 'cloud';
      process.env.API_KEY_PREFIX = 'custom_';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.port).toBe(4000);
      expect(config.worker.mode).toBe('cloud');
      expect(config.apiKey.prefix).toBe('custom_');
    });

    it('should correctly identify environment modes', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.isTest).toBe(true);
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(false);
    });
  });

  describe('worker configuration', () => {
    it('should return local URL in local mode', () => {
      process.env.NODE_ENV = 'test';
      process.env.WORKER_MODE = 'local';
      process.env.LOCAL_WORKER_URL = 'http://localhost:3001';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.worker.activeUrl).toBe('http://localhost:3001');
    });

    it('should return cloud URL in cloud mode', () => {
      process.env.NODE_ENV = 'test';
      process.env.WORKER_MODE = 'cloud';
      process.env.CLOUD_WORKER_URL = 'https://modal.run';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.worker.activeUrl).toBe('https://modal.run');
    });

    it('should detect if worker is configured', () => {
      process.env.NODE_ENV = 'test';
      process.env.WORKER_MODE = 'local';
      process.env.LOCAL_WORKER_URL = 'http://localhost:3001';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.worker.isConfigured).toBe(true);
    });

    it('should detect if worker is not configured', () => {
      process.env.NODE_ENV = 'test';
      process.env.WORKER_MODE = 'local';
      // LOCAL_WORKER_URL not set
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.worker.isConfigured).toBe(false);
    });
  });

  describe('rate limit helpers', () => {
    it('should return correct rate limit for FREE plan', () => {
      process.env.NODE_ENV = 'test';
      process.env.RATE_LIMIT_FREE = '5';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.rateLimit.getLimit('FREE')).toBe(5);
    });

    it('should return correct rate limit for PRO plan', () => {
      process.env.NODE_ENV = 'test';
      process.env.RATE_LIMIT_PRO = '25';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.rateLimit.getLimit('PRO')).toBe(25);
    });

    it('should return correct rate limit for PAYG plan', () => {
      process.env.NODE_ENV = 'test';
      process.env.RATE_LIMIT_PAYG = '150';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.rateLimit.getLimit('PAYG')).toBe(150);
    });
  });

  describe('quota helpers', () => {
    it('should return correct quota for FREE plan', () => {
      process.env.NODE_ENV = 'test';
      process.env.QUOTA_FREE = '120';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.quota.getQuota('FREE')).toBe(120);
    });

    it('should return correct quota for PRO plan', () => {
      process.env.NODE_ENV = 'test';
      process.env.QUOTA_PRO = '1200';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.quota.getQuota('PRO')).toBe(1200);
    });

    it('should return Infinity for PAYG plan', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.quota.getQuota('PAYG')).toBe(Infinity);
    });
  });

  describe('file helpers', () => {
    it('should correctly identify allowed formats', () => {
      process.env.NODE_ENV = 'test';
      process.env.ALLOWED_FORMATS = 'mp3,wav,m4a';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.file.isFormatAllowed('mp3')).toBe(true);
      expect(config.file.isFormatAllowed('wav')).toBe(true);
      expect(config.file.isFormatAllowed('exe')).toBe(false);
    });

    it('should be case-insensitive for format checking', () => {
      process.env.NODE_ENV = 'test';
      process.env.ALLOWED_FORMATS = 'mp3,wav';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.file.isFormatAllowed('MP3')).toBe(true);
      expect(config.file.isFormatAllowed('WAV')).toBe(true);
    });

    it('should convert MB to bytes correctly', () => {
      process.env.NODE_ENV = 'test';
      process.env.MAX_FILE_SIZE_MB = '100';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.S3_ACCESS_KEY = 'test-key';
      process.env.S3_SECRET_KEY = 'test-secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.STRIPE_PRICE_ID_PRO = 'price_123';

      const { config } = require('../index');

      expect(config.file.maxSizeBytes).toBe(100 * 1024 * 1024);
    });
  });

  describe('validateWorkerConfig', () => {
    it('should pass validation for valid local worker config', () => {
      const workerConfig = {
        mode: 'local',
        localUrl: 'http://localhost:3001',
        cloudUrl: undefined,
      };

      const errors = validateWorkerConfig(workerConfig);
      const criticalErrors = errors.filter(e => e.severity === 'error');

      expect(criticalErrors).toHaveLength(0);
    });

    it('should pass validation for valid cloud worker config', () => {
      const workerConfig = {
        mode: 'cloud',
        localUrl: undefined,
        cloudUrl: 'https://modal.run',
      };

      const errors = validateWorkerConfig(workerConfig);
      const criticalErrors = errors.filter(e => e.severity === 'error');

      expect(criticalErrors).toHaveLength(0);
    });

    it('should fail validation for invalid worker mode', () => {
      const workerConfig = {
        mode: 'invalid',
        localUrl: 'http://localhost:3001',
        cloudUrl: undefined,
      };

      const errors = validateWorkerConfig(workerConfig);
      const criticalErrors = errors.filter(e => e.severity === 'error');

      expect(criticalErrors.length).toBeGreaterThan(0);
      expect(criticalErrors[0].message).toContain('Invalid WORKER_MODE');
    });

    it('should warn when local URL is missing in local mode', () => {
      const workerConfig = {
        mode: 'local',
        localUrl: undefined,
        cloudUrl: undefined,
      };

      const errors = validateWorkerConfig(workerConfig);
      const warnings = errors.filter(e => e.severity === 'warning');

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('LOCAL_WORKER_URL is not set');
    });

    it('should warn when cloud URL is missing in cloud mode', () => {
      const workerConfig = {
        mode: 'cloud',
        localUrl: undefined,
        cloudUrl: undefined,
      };

      const errors = validateWorkerConfig(workerConfig);
      const warnings = errors.filter(e => e.severity === 'warning');

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('CLOUD_WORKER_URL is not set');
    });

    it('should fail validation for invalid URL format', () => {
      const workerConfig = {
        mode: 'local',
        localUrl: 'not-a-valid-url',
        cloudUrl: undefined,
      };

      const errors = validateWorkerConfig(workerConfig);
      const criticalErrors = errors.filter(e => e.severity === 'error');

      expect(criticalErrors.length).toBeGreaterThan(0);
      expect(criticalErrors[0].message).toContain('not a valid URL');
    });
  });

  describe('validateConfig', () => {
    it('should throw error when required fields are missing', () => {
      const invalidConfig = {
        port: 3000,
        s3: {},
        stripe: {},
        worker: { mode: 'local' },
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Configuration validation failed');
    });

    it('should pass validation with all required fields', () => {
      const validConfig = {
        databaseUrl: 'postgresql://test',
        s3: {
          bucket: 'test-bucket',
          accessKey: 'test-key',
          secretKey: 'test-secret',
        },
        stripe: {
          secretKey: 'sk_test_123',
          webhookSecret: 'whsec_123',
          priceIdPro: 'price_123',
        },
        worker: {
          mode: 'local',
          localUrl: 'http://localhost:3001',
        },
        port: 3000,
        rateLimit: { free: 3, pro: 20, payg: 100 },
        quota: { free: 60, pro: 600 },
        file: {
          maxSizeMB: 500,
          allowedFormats: ['mp3', 'wav'],
          retentionHours: 24,
        },
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should fail validation for invalid port', () => {
      const invalidConfig = {
        databaseUrl: 'postgresql://test',
        port: 99999, // Invalid port
        s3: {
          bucket: 'test-bucket',
          accessKey: 'test-key',
          secretKey: 'test-secret',
        },
        stripe: {
          secretKey: 'sk_test_123',
          webhookSecret: 'whsec_123',
          priceIdPro: 'price_123',
        },
        worker: {
          mode: 'local',
          localUrl: 'http://localhost:3001',
        },
        rateLimit: { free: 3, pro: 20, payg: 100 },
        quota: { free: 60, pro: 600 },
        file: {
          maxSizeMB: 500,
          allowedFormats: ['mp3'],
          retentionHours: 24,
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should fail validation for negative rate limits', () => {
      const invalidConfig = {
        databaseUrl: 'postgresql://test',
        port: 3000,
        s3: {
          bucket: 'test-bucket',
          accessKey: 'test-key',
          secretKey: 'test-secret',
        },
        stripe: {
          secretKey: 'sk_test_123',
          webhookSecret: 'whsec_123',
          priceIdPro: 'price_123',
        },
        worker: {
          mode: 'local',
          localUrl: 'http://localhost:3001',
        },
        rateLimit: { free: -1, pro: 20, payg: 100 },
        quota: { free: 60, pro: 600 },
        file: {
          maxSizeMB: 500,
          allowedFormats: ['mp3'],
          retentionHours: 24,
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should fail validation for empty allowed formats', () => {
      const invalidConfig = {
        databaseUrl: 'postgresql://test',
        port: 3000,
        s3: {
          bucket: 'test-bucket',
          accessKey: 'test-key',
          secretKey: 'test-secret',
        },
        stripe: {
          secretKey: 'sk_test_123',
          webhookSecret: 'whsec_123',
          priceIdPro: 'price_123',
        },
        worker: {
          mode: 'local',
          localUrl: 'http://localhost:3001',
        },
        rateLimit: { free: 3, pro: 20, payg: 100 },
        quota: { free: 60, pro: 600 },
        file: {
          maxSizeMB: 500,
          allowedFormats: [],
          retentionHours: 24,
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow();
    });
  });
});

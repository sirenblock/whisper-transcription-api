/**
 * Tests for Cloud Worker Service
 *
 * Run with: npm test cloudWorker.service.test.js
 */

const axios = require('axios');
const { submitToCloudWorker, checkWorkerHealth, estimateCost } = require('./cloudWorker.service');

// Mock axios
jest.mock('axios');

describe('CloudWorkerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLOUD_WORKER_URL = 'https://test--whisper-transcription.modal.run';
  });

  afterEach(() => {
    delete process.env.CLOUD_WORKER_URL;
  });

  describe('submitToCloudWorker', () => {
    const validJobData = {
      transcriptionId: 'trans_123',
      userId: 'user_456',
      s3AudioUrl: 'https://bucket.s3.amazonaws.com/audio/test.mp3',
      model: 'BASE',
      format: 'JSON'
    };

    it('should submit job successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          s3ResultUrl: 's3://bucket/results/user_456/trans_123.json',
          durationSeconds: 125.5,
          processingTime: 15.2
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await submitToCloudWorker(validJobData);

      expect(result.success).toBe(true);
      expect(result.s3ResultUrl).toBeDefined();
      expect(result.durationSeconds).toBe(125.5);

      expect(axios.post).toHaveBeenCalledWith(
        process.env.CLOUD_WORKER_URL,
        validJobData,
        expect.objectContaining({
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should throw error if CLOUD_WORKER_URL not configured', async () => {
      delete process.env.CLOUD_WORKER_URL;

      await expect(submitToCloudWorker(validJobData))
        .rejects
        .toThrow('CLOUD_WORKER_URL not configured');
    });

    it('should validate required fields', async () => {
      const invalidJob = {
        transcriptionId: 'trans_123'
        // Missing userId and s3AudioUrl
      };

      await expect(submitToCloudWorker(invalidJob))
        .rejects
        .toThrow('Missing required job data fields');
    });

    it('should validate model field', async () => {
      const invalidJob = {
        ...validJobData,
        model: 'INVALID_MODEL'
      };

      await expect(submitToCloudWorker(invalidJob))
        .rejects
        .toThrow('Invalid model');
    });

    it('should validate format field', async () => {
      const invalidJob = {
        ...validJobData,
        format: 'INVALID_FORMAT'
      };

      await expect(submitToCloudWorker(invalidJob))
        .rejects
        .toThrow('Invalid format');
    });

    it('should handle HTTP error responses', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Transcription failed' }
        }
      });

      await expect(submitToCloudWorker(validJobData))
        .rejects
        .toThrow('Cloud worker returned 500');
    });

    it('should handle network errors', async () => {
      axios.post.mockRejectedValue({
        request: {},
        message: 'Network error'
      });

      await expect(submitToCloudWorker(validJobData))
        .rejects
        .toThrow('Cloud worker did not respond');
    });

    it('should include callback URL if provided', async () => {
      const jobWithCallback = {
        ...validJobData,
        callbackUrl: 'https://api.example.com/webhooks/transcription'
      };

      axios.post.mockResolvedValue({
        data: { success: true }
      });

      await submitToCloudWorker(jobWithCallback);

      expect(axios.post).toHaveBeenCalledWith(
        process.env.CLOUD_WORKER_URL,
        expect.objectContaining({
          callbackUrl: 'https://api.example.com/webhooks/transcription'
        }),
        expect.any(Object)
      );
    });

    it('should accept all valid models', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });

      for (const model of ['BASE', 'SMALL', 'MEDIUM']) {
        const job = { ...validJobData, model };
        const result = await submitToCloudWorker(job);
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid formats', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });

      for (const format of ['JSON', 'SRT', 'VTT', 'TXT']) {
        const job = { ...validJobData, format };
        const result = await submitToCloudWorker(job);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('checkWorkerHealth', () => {
    it('should check worker health successfully', async () => {
      axios.get.mockResolvedValue({
        data: {
          status: 'healthy',
          worker: 'cloud'
        }
      });

      const result = await checkWorkerHealth();

      expect(result.status).toBe('healthy');
      expect(result.worker).toBe('cloud');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error if CLOUD_WORKER_URL not configured', async () => {
      delete process.env.CLOUD_WORKER_URL;

      await expect(checkWorkerHealth())
        .rejects
        .toThrow('CLOUD_WORKER_URL not configured');
    });

    it('should return unhealthy status on error', async () => {
      axios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await checkWorkerHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
    });

    it('should use correct health endpoint', async () => {
      axios.get.mockResolvedValue({ data: { status: 'healthy' } });

      await checkWorkerHealth();

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ timeout: 10000 })
      );
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost for BASE model on T4', () => {
      const result = estimateCost(3600, 'BASE', 'T4'); // 60 minutes

      expect(result.durationSeconds).toBe(3600);
      expect(result.model).toBe('BASE');
      expect(result.gpuType).toBe('T4');
      expect(result.processingTimeSeconds).toBe(225); // 3600 / 16 RTF
      expect(result.realTimeFactor).toBe(16);
      expect(result.hourlyRate).toBe(0.60);
      expect(result.estimatedCostUSD).toBeCloseTo(0.0375, 2); // 225s / 3600 * 0.60
    });

    it('should calculate cost for MEDIUM model on A10G', () => {
      const result = estimateCost(3600, 'MEDIUM', 'A10G');

      expect(result.realTimeFactor).toBe(4);
      expect(result.hourlyRate).toBe(1.10);
      expect(result.processingTimeSeconds).toBe(900); // 3600 / 4 RTF
    });

    it('should default to BASE and T4 if not specified', () => {
      const result = estimateCost(1800);

      expect(result.model).toBe('BASE');
      expect(result.gpuType).toBe('T4');
    });

    it('should handle short audio files', () => {
      const result = estimateCost(60, 'BASE', 'T4'); // 1 minute

      expect(result.processingTimeSeconds).toBe(3.8); // 60 / 16 ≈ 3.75, rounded to 3.8
      expect(result.estimatedCostUSD).toBeLessThan(0.01);
    });

    it('should handle long audio files', () => {
      const result = estimateCost(36000, 'SMALL', 'T4'); // 10 hours

      expect(result.processingTimeSeconds).toBe(4500); // 36000 / 8 RTF
      expect(result.estimatedCostUSD).toBeGreaterThan(0);
    });

    it('should return consistent format', () => {
      const result = estimateCost(1200, 'SMALL', 'A10G');

      expect(result).toHaveProperty('durationSeconds');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('gpuType');
      expect(result).toHaveProperty('processingTimeSeconds');
      expect(result).toHaveProperty('estimatedCostUSD');
      expect(result).toHaveProperty('hourlyRate');
      expect(result).toHaveProperty('realTimeFactor');
    });
  });
});

/**
 * @jest-environment node
 */

import {
  generateUploadUrl,
  getDownloadUrl,
  uploadFile,
  deleteFile,
  scheduleCleanup,
  getFileSize,
  fileExists,
  isValidAudioFile,
  isValidFileSize,
  getMaxFileSize,
  getAllowedMimeTypes,
  parseS3Url,
  isValidFileExtension,
} from '../s3.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();

  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    HeadObjectCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.s3.amazonaws.com/test'),
}));

// Mock environment variables
process.env.S3_BUCKET = 'test-whisper-audio';
process.env.S3_REGION = 'us-east-1';
process.env.S3_ACCESS_KEY = 'test-access-key';
process.env.S3_SECRET_KEY = 'test-secret-key';
process.env.MAX_FILE_SIZE_MB = '500';
process.env.ALLOWED_FORMATS = 'mp3,wav,m4a,mp4,mpeg,webm';

describe('S3 Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateUploadUrl', () => {
    it('should generate presigned upload URL with correct structure', async () => {
      const result = await generateUploadUrl('user123', 'test.mp3', 'audio/mpeg');

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('s3Key');
      expect(result).toHaveProperty('expiresAt');
      expect(result.uploadUrl).toContain('https://');
      expect(result.s3Key).toContain('uploads/user123/');
      expect(result.s3Key).toContain('test.mp3');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should sanitize filename with special characters', async () => {
      const result = await generateUploadUrl('user123', 'my file!@#$.mp3', 'audio/mpeg');

      expect(result.s3Key).toMatch(/my_file____\.mp3$/);
      expect(result.s3Key).not.toContain('!');
      expect(result.s3Key).not.toContain('@');
      expect(result.s3Key).not.toContain('#');
      expect(result.s3Key).not.toContain('$');
    });

    it('should include userId in S3 key path', async () => {
      const result = await generateUploadUrl('user456', 'audio.wav', 'audio/wav');

      expect(result.s3Key).toContain('uploads/user456/');
    });

    it('should generate unique keys for same filename', async () => {
      const result1 = await generateUploadUrl('user123', 'test.mp3', 'audio/mpeg');
      const result2 = await generateUploadUrl('user123', 'test.mp3', 'audio/mpeg');

      expect(result1.s3Key).not.toEqual(result2.s3Key);
    });

    it('should accept custom expiration time', async () => {
      const customExpiry = 7200; // 2 hours
      const result = await generateUploadUrl('user123', 'test.mp3', 'audio/mpeg', customExpiry);

      const expectedExpiry = Date.now() + customExpiry * 1000;
      const actualExpiry = result.expiresAt.getTime();

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    it('should handle errors gracefully', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockRejectedValueOnce(new Error('AWS error'));

      await expect(
        generateUploadUrl('user123', 'test.mp3', 'audio/mpeg')
      ).rejects.toThrow('Failed to generate upload URL');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate presigned download URL', async () => {
      const url = await getDownloadUrl('uploads/user123/test.mp3');

      expect(url).toBeDefined();
      expect(url).toContain('https://');
    });

    it('should accept custom expiration time', async () => {
      const url = await getDownloadUrl('uploads/user123/test.mp3', 7200);

      expect(url).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockRejectedValueOnce(new Error('AWS error'));

      await expect(
        getDownloadUrl('uploads/user123/test.mp3')
      ).rejects.toThrow('Failed to generate download URL');
    });
  });

  describe('uploadFile', () => {
    it('should upload file buffer successfully', async () => {
      const buffer = Buffer.from('test audio data');
      const s3Url = await uploadFile('results/user123/transcript.json', buffer, 'application/json');

      expect(s3Url).toBe('s3://test-whisper-audio/results/user123/transcript.json');
    });

    it('should handle upload errors', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockRejectedValueOnce(new Error('Upload failed'));
      S3Client.mockImplementationOnce(() => ({ send: mockSend }));

      const buffer = Buffer.from('test data');

      await expect(
        uploadFile('test/file.txt', buffer, 'text/plain')
      ).rejects.toThrow('Failed to upload file');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      await expect(deleteFile('uploads/user123/old_file.mp3')).resolves.not.toThrow();
    });

    it('should handle deletion errors', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockRejectedValueOnce(new Error('Delete failed'));
      S3Client.mockImplementationOnce(() => ({ send: mockSend }));

      await expect(
        deleteFile('uploads/user123/file.mp3')
      ).rejects.toThrow('Failed to delete file');
    });
  });

  describe('scheduleCleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule file deletion', async () => {
      await scheduleCleanup('uploads/temp.mp3', 24);

      // Verify setTimeout was called with correct time
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000);
    });

    it('should delete file after timeout', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockResolvedValue({});
      S3Client.mockImplementation(() => ({ send: mockSend }));

      await scheduleCleanup('uploads/temp.mp3', 1);

      // Fast-forward time
      jest.advanceTimersByTime(1 * 60 * 60 * 1000);

      // Wait for async operations
      await Promise.resolve();

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockResolvedValue({ ContentLength: 1024000 });
      S3Client.mockImplementation(() => ({ send: mockSend }));

      const size = await getFileSize('uploads/user123/audio.mp3');

      expect(size).toBe(1024000);
    });

    it('should return 0 for missing ContentLength', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockResolvedValue({});
      S3Client.mockImplementation(() => ({ send: mockSend }));

      const size = await getFileSize('uploads/user123/audio.mp3');

      expect(size).toBe(0);
    });

    it('should handle errors', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockRejectedValueOnce(new Error('File not found'));
      S3Client.mockImplementation(() => ({ send: mockSend }));

      await expect(
        getFileSize('uploads/nonexistent.mp3')
      ).rejects.toThrow('Failed to get file size');
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockResolvedValue({ ContentLength: 1024 });
      S3Client.mockImplementation(() => ({ send: mockSend }));

      const exists = await fileExists('uploads/user123/audio.mp3');

      expect(exists).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      const mockSend = jest.fn().mockRejectedValueOnce(new Error('Not found'));
      S3Client.mockImplementation(() => ({ send: mockSend }));

      const exists = await fileExists('uploads/nonexistent.mp3');

      expect(exists).toBe(false);
    });
  });

  describe('isValidAudioFile', () => {
    it('should accept valid audio MIME types', () => {
      expect(isValidAudioFile('audio/mpeg')).toBe(true);
      expect(isValidAudioFile('audio/mp3')).toBe(true);
      expect(isValidAudioFile('audio/wav')).toBe(true);
      expect(isValidAudioFile('audio/x-wav')).toBe(true);
      expect(isValidAudioFile('audio/m4a')).toBe(true);
      expect(isValidAudioFile('audio/x-m4a')).toBe(true);
      expect(isValidAudioFile('audio/mp4')).toBe(true);
      expect(isValidAudioFile('video/mp4')).toBe(true);
      expect(isValidAudioFile('audio/webm')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isValidAudioFile('AUDIO/MPEG')).toBe(true);
      expect(isValidAudioFile('Audio/Wav')).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      expect(isValidAudioFile('image/png')).toBe(false);
      expect(isValidAudioFile('text/plain')).toBe(false);
      expect(isValidAudioFile('video/avi')).toBe(false);
      expect(isValidAudioFile('application/pdf')).toBe(false);
    });

    it('should reject empty or malformed types', () => {
      expect(isValidAudioFile('')).toBe(false);
      expect(isValidAudioFile('invalid')).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('should accept files under 500MB', () => {
      expect(isValidFileSize(100 * 1024 * 1024)).toBe(true); // 100MB
      expect(isValidFileSize(250 * 1024 * 1024)).toBe(true); // 250MB
      expect(isValidFileSize(499 * 1024 * 1024)).toBe(true); // 499MB
    });

    it('should accept files exactly at limit', () => {
      expect(isValidFileSize(500 * 1024 * 1024)).toBe(true); // 500MB exactly
    });

    it('should reject files over 500MB', () => {
      expect(isValidFileSize(501 * 1024 * 1024)).toBe(false); // 501MB
      expect(isValidFileSize(600 * 1024 * 1024)).toBe(false); // 600MB
      expect(isValidFileSize(1024 * 1024 * 1024)).toBe(false); // 1GB
    });

    it('should reject zero or negative sizes', () => {
      expect(isValidFileSize(0)).toBe(false);
      expect(isValidFileSize(-1)).toBe(false);
      expect(isValidFileSize(-1000)).toBe(false);
    });

    it('should accept small files', () => {
      expect(isValidFileSize(1)).toBe(true);
      expect(isValidFileSize(1024)).toBe(true); // 1KB
      expect(isValidFileSize(1024 * 1024)).toBe(true); // 1MB
    });
  });

  describe('getMaxFileSize', () => {
    it('should return maximum file size in bytes', () => {
      const maxSize = getMaxFileSize();
      expect(maxSize).toBe(500 * 1024 * 1024);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return array of allowed MIME types', () => {
      const types = getAllowedMimeTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('audio/mpeg');
      expect(types).toContain('audio/wav');
      expect(types).toContain('video/mp4');
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return a copy, not the original array', () => {
      const types1 = getAllowedMimeTypes();
      const types2 = getAllowedMimeTypes();

      expect(types1).not.toBe(types2); // Different array instances
      expect(types1).toEqual(types2); // But same content
    });
  });

  describe('parseS3Url', () => {
    it('should parse valid S3 URL', () => {
      const result = parseS3Url('s3://whisper-audio/uploads/user123/file.mp3');

      expect(result).toEqual({
        bucket: 'whisper-audio',
        key: 'uploads/user123/file.mp3',
      });
    });

    it('should handle URLs with complex keys', () => {
      const result = parseS3Url('s3://my-bucket/path/to/deeply/nested/file.mp3');

      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'path/to/deeply/nested/file.mp3',
      });
    });

    it('should throw error for invalid URL format', () => {
      expect(() => parseS3Url('https://example.com/file.mp3')).toThrow('Invalid S3 URL format');
      expect(() => parseS3Url('invalid-url')).toThrow('Invalid S3 URL format');
      expect(() => parseS3Url('s3://bucket-only')).toThrow('Invalid S3 URL format');
    });
  });

  describe('isValidFileExtension', () => {
    it('should accept valid extensions', () => {
      expect(isValidFileExtension('audio.mp3')).toBe(true);
      expect(isValidFileExtension('podcast.wav')).toBe(true);
      expect(isValidFileExtension('voice.m4a')).toBe(true);
      expect(isValidFileExtension('video.mp4')).toBe(true);
      expect(isValidFileExtension('stream.webm')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isValidFileExtension('audio.MP3')).toBe(true);
      expect(isValidFileExtension('audio.Mp3')).toBe(true);
      expect(isValidFileExtension('audio.WAV')).toBe(true);
    });

    it('should reject invalid extensions', () => {
      expect(isValidFileExtension('document.pdf')).toBe(false);
      expect(isValidFileExtension('image.png')).toBe(false);
      expect(isValidFileExtension('video.avi')).toBe(false);
    });

    it('should handle files with no extension', () => {
      expect(isValidFileExtension('noextension')).toBe(false);
    });

    it('should handle files with multiple dots', () => {
      expect(isValidFileExtension('my.audio.file.mp3')).toBe(true);
      expect(isValidFileExtension('my.document.file.pdf')).toBe(false);
    });
  });
});

describe('S3 Service Integration', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle complete upload-download workflow', async () => {
    const { uploadUrl, s3Key } = await generateUploadUrl('user123', 'test.mp3', 'audio/mpeg');

    expect(uploadUrl).toBeDefined();
    expect(s3Key).toContain('user123');

    const downloadUrl = await getDownloadUrl(s3Key);
    expect(downloadUrl).toBeDefined();
  });

  it('should validate file before generating upload URL', () => {
    const contentType = 'audio/mpeg';
    const fileSize = 100 * 1024 * 1024; // 100MB
    const filename = 'test.mp3';

    expect(isValidAudioFile(contentType)).toBe(true);
    expect(isValidFileSize(fileSize)).toBe(true);
    expect(isValidFileExtension(filename)).toBe(true);
  });

  it('should reject invalid files', () => {
    expect(isValidAudioFile('image/png')).toBe(false);
    expect(isValidFileSize(600 * 1024 * 1024)).toBe(false);
    expect(isValidFileExtension('image.png')).toBe(false);
  });
});

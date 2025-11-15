/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');
const {
  runWhisper,
  validateWhisperSetup,
  getModelInfo,
  MODEL_FILES,
  FORMAT_FLAGS,
  FORMAT_EXTENSIONS
} = require('../whisper-runner');

// Mock child_process
jest.mock('child_process');
const { spawn } = require('child_process');

// Mock fs
jest.mock('fs');

// Mock path to use test directories
const TEST_DIR = '/tmp/whisper-test';
const TEST_AUDIO = path.join(TEST_DIR, 'test.wav');

describe('WhisperRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHISPER_PATH = '/usr/local/bin/whisper';
    process.env.MODELS_PATH = '/usr/local/share/whisper/models';
  });

  afterEach(() => {
    delete process.env.WHISPER_PATH;
    delete process.env.MODELS_PATH;
    delete process.env.WHISPER_LANGUAGE;
    delete process.env.WHISPER_TRANSLATE;
  });

  describe('validateWhisperSetup', () => {
    it('should validate successful setup', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.accessSync.mockReturnValue(true);

      const result = await validateWhisperSetup();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing whisper binary', async () => {
      fs.existsSync.mockImplementation((path) => {
        return !path.includes('whisper');
      });

      const result = await validateWhisperSetup();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Whisper binary not found');
    });

    it('should detect missing models', async () => {
      fs.existsSync.mockImplementation((path) => {
        // Binary exists but models don't
        if (path.includes('whisper') && !path.includes('models')) return true;
        if (path.includes('models') && !path.includes('.bin')) return true;
        return false;
      });
      fs.accessSync.mockReturnValue(true);

      const result = await validateWhisperSetup();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect non-executable binary', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.accessSync.mockImplementation(() => {
        throw new Error('Not executable');
      });

      const result = await validateWhisperSetup();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not executable'))).toBe(true);
    });
  });

  describe('runWhisper', () => {
    let mockProcess;

    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });

      mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn(),
        kill: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
    });

    it('should successfully run transcription with BASE model and JSON format', async () => {
      const progressCallback = jest.fn();

      // Simulate successful completion
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0, null), 10);
        }
      });

      const promise = runWhisper(TEST_AUDIO, 'BASE', 'JSON', progressCallback);

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        '/usr/local/bin/whisper',
        expect.arrayContaining([
          '-m', expect.stringContaining('ggml-base.bin'),
          '-f', TEST_AUDIO,
          '-oj',
          expect.any(String)
        ]),
        expect.any(Object)
      );
    });

    it('should handle progress updates', async () => {
      const progressCallback = jest.fn();

      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from('progress = 25%'));
            callback(Buffer.from('progress = 50%'));
            callback(Buffer.from('progress = 75%'));
          }, 10);
        }
      });

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0, null), 50);
        }
      });

      await runWhisper(TEST_AUDIO, 'BASE', 'JSON', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(25);
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(75);
    });

    it('should support all model types', async () => {
      for (const model of ['BASE', 'SMALL', 'MEDIUM']) {
        jest.clearAllMocks();

        mockProcess.on.mockImplementation((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10);
          }
        });

        await runWhisper(TEST_AUDIO, model, 'JSON');

        expect(spawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            '-m', expect.stringContaining(MODEL_FILES[model])
          ]),
          expect.any(Object)
        );
      }
    });

    it('should support all output formats', async () => {
      for (const format of ['JSON', 'SRT', 'VTT', 'TXT']) {
        jest.clearAllMocks();

        mockProcess.on.mockImplementation((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10);
          }
        });

        await runWhisper(TEST_AUDIO, 'BASE', format);

        expect(spawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([FORMAT_FLAGS[format]]),
          expect.any(Object)
        );
      }
    });

    it('should reject if audio file does not exist', async () => {
      fs.existsSync.mockImplementation((path) => {
        return path !== TEST_AUDIO;
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('Audio file not found');
    });

    it('should reject with invalid model', async () => {
      await expect(runWhisper(TEST_AUDIO, 'INVALID', 'JSON'))
        .rejects
        .toThrow('Invalid model');
    });

    it('should reject with invalid format', async () => {
      await expect(runWhisper(TEST_AUDIO, 'BASE', 'INVALID'))
        .rejects
        .toThrow('Invalid format');
    });

    it('should reject if model file does not exist', async () => {
      fs.existsSync.mockImplementation((path) => {
        if (path === TEST_AUDIO) return true;
        if (path.includes('.bin')) return false;
        return true;
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('Model file not found');
    });

    it('should handle process exit with error code', async () => {
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(1, null), 10);
        }
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('Whisper process exited with code 1');
    });

    it('should handle process killed by signal', async () => {
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(null, 'SIGTERM'), 10);
        }
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('killed with signal SIGTERM');
    });

    it('should handle process spawn error', async () => {
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Spawn failed')), 10);
        }
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('Failed to start Whisper process');
    });

    it('should handle empty output file', async () => {
      fs.statSync.mockReturnValue({ size: 0 });

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0, null), 10);
        }
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('empty output file');
    });

    it('should handle missing output file', async () => {
      fs.existsSync.mockImplementation((path) => {
        // Audio file exists, but output doesn't
        if (path === TEST_AUDIO) return true;
        if (path.includes('.json')) return false;
        return true;
      });

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0, null), 10);
        }
      });

      await expect(runWhisper(TEST_AUDIO, 'BASE', 'JSON'))
        .rejects
        .toThrow('did not create output file');
    });

    it('should add language parameter from environment', async () => {
      process.env.WHISPER_LANGUAGE = 'es';

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0, null), 10);
        }
      });

      await runWhisper(TEST_AUDIO, 'BASE', 'JSON');

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['-l', 'es']),
        expect.any(Object)
      );
    });

    it('should add translate flag from environment', async () => {
      process.env.WHISPER_TRANSLATE = 'true';

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0, null), 10);
        }
      });

      await runWhisper(TEST_AUDIO, 'BASE', 'JSON');

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--translate']),
        expect.any(Object)
      );
    });
  });

  describe('getModelInfo', () => {
    it('should return info for installed models', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 142606336 }); // ~136 MB

      const info = getModelInfo();

      expect(info).toHaveProperty('BASE');
      expect(info).toHaveProperty('SMALL');
      expect(info).toHaveProperty('MEDIUM');
      expect(info.BASE).toHaveProperty('size');
      expect(info.BASE).toHaveProperty('sizeMB');
    });

    it('should mark missing models', () => {
      fs.existsSync.mockReturnValue(false);

      const info = getModelInfo();

      expect(info.BASE).toHaveProperty('installed', false);
      expect(info.SMALL).toHaveProperty('installed', false);
      expect(info.MEDIUM).toHaveProperty('installed', false);
    });
  });

  describe('Constants', () => {
    it('should export MODEL_FILES', () => {
      expect(MODEL_FILES).toBeDefined();
      expect(MODEL_FILES.BASE).toBe('ggml-base.bin');
      expect(MODEL_FILES.SMALL).toBe('ggml-small.bin');
      expect(MODEL_FILES.MEDIUM).toBe('ggml-medium.bin');
    });

    it('should export FORMAT_FLAGS', () => {
      expect(FORMAT_FLAGS).toBeDefined();
      expect(FORMAT_FLAGS.JSON).toBe('-oj');
      expect(FORMAT_FLAGS.SRT).toBe('-osrt');
      expect(FORMAT_FLAGS.VTT).toBe('-ovtt');
      expect(FORMAT_FLAGS.TXT).toBe('-otxt');
    });

    it('should export FORMAT_EXTENSIONS', () => {
      expect(FORMAT_EXTENSIONS).toBeDefined();
      expect(FORMAT_EXTENSIONS.JSON).toBe('json');
      expect(FORMAT_EXTENSIONS.SRT).toBe('srt');
      expect(FORMAT_EXTENSIONS.VTT).toBe('vtt');
      expect(FORMAT_EXTENSIONS.TXT).toBe('txt');
    });
  });
});

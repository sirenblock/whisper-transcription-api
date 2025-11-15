/**
 * @module LocalWorker
 * @description Mac Mini worker process that polls BullMQ queue and processes transcriptions using whisper.cpp with Metal acceleration
 *
 * @requires ../../backend/src/services/queue.service
 * @requires ./whisper-runner
 * @requires ../../backend/src/services/s3.service
 * @requires ../../backend/src/db/helpers
 *
 * @example
 * node index.js
 *
 * @exports Worker process (auto-starts on require)
 */

const { Worker } = require('bullmq');
const { runWhisper } = require('./whisper-runner');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Environment configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TEMP_DIR = process.env.TEMP_DIR || path.join(__dirname, 'temp');
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Structured logging utility
 */
function log(level, message, data = {}) {
  if (LOG_LEVEL === 'error' && level !== 'error') return;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    module: 'local-worker',
    message,
    data
  }));
}

/**
 * Downloads a file from a URL to local filesystem
 * @param {string} url - The URL to download from
 * @param {string} dest - Destination file path
 * @returns {Promise<void>}
 */
async function downloadFile(url, dest) {
  const file = fs.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(resolve);
      });

      file.on('error', (err) => {
        file.close();
        fs.unlinkSync(dest);
        reject(err);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });

    request.setTimeout(300000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Gets the duration of an audio file using ffprobe
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(filePath) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    log('error', 'Failed to get audio duration', { error: error.message, filePath });
    throw new Error(`Failed to get audio duration: ${error.message}`);
  }
}

/**
 * Converts audio file to WAV format suitable for Whisper
 * @param {string} inputPath - Input audio file path
 * @param {string} outputPath - Output WAV file path
 * @returns {Promise<void>}
 */
async function convertToWav(inputPath, outputPath) {
  try {
    // Convert to 16kHz mono WAV with PCM 16-bit encoding
    await execPromise(
      `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le -y "${outputPath}"`
    );
    log('info', 'Audio converted to WAV', { inputPath, outputPath });
  } catch (error) {
    log('error', 'Failed to convert audio to WAV', { error: error.message, inputPath });
    throw new Error(`Failed to convert audio: ${error.message}`);
  }
}

/**
 * Safely deletes a file if it exists
 * @param {string} filePath - Path to file to delete
 */
function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log('info', 'File deleted', { filePath });
    }
  } catch (error) {
    log('warn', 'Failed to delete file', { error: error.message, filePath });
  }
}

/**
 * Main job processing function
 * @param {Object} job - BullMQ job object
 * @returns {Promise<Object>} Result with s3ResultUrl and durationSeconds
 */
async function processTranscription(job) {
  const { transcriptionId, userId, s3AudioUrl, model, format } = job.data;

  log('info', 'Starting transcription job', {
    jobId: job.id,
    transcriptionId,
    userId,
    model,
    format
  });

  const audioPath = path.join(TEMP_DIR, `${transcriptionId}_${Date.now()}.audio`);
  const wavPath = path.join(TEMP_DIR, `${transcriptionId}_${Date.now()}.wav`);
  let resultPath = null;

  try {
    // Update status to PROCESSING
    await job.updateProgress(5);
    await updateTranscriptionStatus(transcriptionId, 'PROCESSING', { progress: 5 });

    // Download audio from S3
    log('info', 'Downloading audio from S3', { transcriptionId, s3AudioUrl });
    const downloadUrl = await getDownloadUrl(s3AudioUrl);
    await downloadFile(downloadUrl, audioPath);
    await job.updateProgress(20);

    // Get original audio duration
    log('info', 'Getting audio duration', { transcriptionId });
    const durationSeconds = await getAudioDuration(audioPath);
    log('info', 'Audio duration retrieved', { transcriptionId, durationSeconds });
    await job.updateProgress(25);

    // Convert to WAV format
    log('info', 'Converting audio to WAV', { transcriptionId });
    await convertToWav(audioPath, wavPath);
    await job.updateProgress(35);
    await updateTranscriptionStatus(transcriptionId, 'PROCESSING', { progress: 35 });

    // Run Whisper transcription
    log('info', 'Running Whisper transcription', { transcriptionId, model, format });
    resultPath = await runWhisper(wavPath, model, format, async (progress) => {
      const totalProgress = 35 + Math.floor(progress * 0.55); // 35% to 90%
      await job.updateProgress(totalProgress);

      // Update database every 10% progress
      if (totalProgress % 10 === 0) {
        await updateTranscriptionStatus(transcriptionId, 'PROCESSING', {
          progress: totalProgress
        });
      }
    });

    await job.updateProgress(90);
    log('info', 'Whisper transcription completed', { transcriptionId, resultPath });

    // Upload result to S3
    log('info', 'Uploading result to S3', { transcriptionId });
    const resultBuffer = fs.readFileSync(resultPath);
    const s3Key = `results/${userId}/${transcriptionId}.${format.toLowerCase()}`;

    const contentTypes = {
      JSON: 'application/json',
      SRT: 'text/srt',
      VTT: 'text/vtt',
      TXT: 'text/plain'
    };

    await uploadFile(s3Key, resultBuffer, contentTypes[format]);
    const s3ResultUrl = s3Key;
    await job.updateProgress(95);

    // Update database with completion
    log('info', 'Updating database with completion', { transcriptionId });
    await updateTranscriptionStatus(transcriptionId, 'COMPLETED', {
      progress: 100,
      s3ResultUrl,
      durationSeconds,
      completedAt: new Date()
    });

    // Record usage
    log('info', 'Recording usage', { transcriptionId, userId, minutes: durationSeconds / 60 });
    await recordUsage(userId, transcriptionId, durationSeconds / 60);

    // Schedule S3 cleanup (delete audio file after retention period)
    const retentionHours = parseInt(process.env.FILE_RETENTION_HOURS || '24', 10);
    await scheduleCleanup(s3AudioUrl, retentionHours);

    // Cleanup local temp files
    log('info', 'Cleaning up temp files', { transcriptionId });
    safeDelete(audioPath);
    safeDelete(wavPath);
    safeDelete(resultPath);

    await job.updateProgress(100);

    log('info', 'Transcription job completed successfully', {
      jobId: job.id,
      transcriptionId,
      durationSeconds
    });

    return { s3ResultUrl, durationSeconds };

  } catch (error) {
    log('error', 'Transcription job failed', {
      jobId: job.id,
      transcriptionId,
      error: error.message,
      stack: error.stack
    });

    // Update database with failure
    try {
      await updateTranscriptionStatus(transcriptionId, 'FAILED', {
        errorMessage: error.message
      });
    } catch (dbError) {
      log('error', 'Failed to update database with error status', {
        transcriptionId,
        dbError: dbError.message
      });
    }

    // Cleanup temp files
    safeDelete(audioPath);
    safeDelete(wavPath);
    if (resultPath) safeDelete(resultPath);

    throw error;
  }
}

// Lazy-load backend dependencies to avoid circular dependencies
let _updateTranscriptionStatus, _recordUsage, _getDownloadUrl, _uploadFile, _scheduleCleanup;

async function updateTranscriptionStatus(...args) {
  if (!_updateTranscriptionStatus) {
    const helpers = require('../../backend/src/db/helpers');
    _updateTranscriptionStatus = helpers.updateTranscriptionStatus;
  }
  return _updateTranscriptionStatus(...args);
}

async function recordUsage(...args) {
  if (!_recordUsage) {
    const helpers = require('../../backend/src/db/helpers');
    _recordUsage = helpers.recordUsage;
  }
  return _recordUsage(...args);
}

async function getDownloadUrl(...args) {
  if (!_getDownloadUrl) {
    const s3Service = require('../../backend/src/services/s3.service');
    _getDownloadUrl = s3Service.getDownloadUrl;
  }
  return _getDownloadUrl(...args);
}

async function uploadFile(...args) {
  if (!_uploadFile) {
    const s3Service = require('../../backend/src/services/s3.service');
    _uploadFile = s3Service.uploadFile;
  }
  return _uploadFile(...args);
}

async function scheduleCleanup(...args) {
  if (!_scheduleCleanup) {
    const s3Service = require('../../backend/src/services/s3.service');
    _scheduleCleanup = s3Service.scheduleCleanup;
  }
  return _scheduleCleanup(...args);
}

/**
 * Create and start the BullMQ worker
 */
function startWorker() {
  const worker = new Worker('transcription-queue', processTranscription, {
    connection: {
      url: REDIS_URL
    },
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: 10,
      duration: 1000
    }
  });

  worker.on('completed', (job, result) => {
    log('info', 'Job completed', {
      jobId: job.id,
      transcriptionId: job.data.transcriptionId,
      result
    });
  });

  worker.on('failed', (job, err) => {
    log('error', 'Job failed', {
      jobId: job?.id,
      transcriptionId: job?.data?.transcriptionId,
      error: err.message,
      stack: err.stack
    });
  });

  worker.on('error', (err) => {
    log('error', 'Worker error', { error: err.message, stack: err.stack });
  });

  worker.on('stalled', (jobId) => {
    log('warn', 'Job stalled', { jobId });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    log('info', 'SIGTERM received, shutting down gracefully');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    log('info', 'SIGINT received, shutting down gracefully');
    await worker.close();
    process.exit(0);
  });

  log('info', 'Worker started successfully', {
    concurrency: WORKER_CONCURRENCY,
    redisUrl: REDIS_URL,
    tempDir: TEMP_DIR
  });

  return worker;
}

// Export for testing
module.exports = {
  startWorker,
  processTranscription,
  downloadFile,
  getAudioDuration,
  convertToWav,
  safeDelete
};

// Auto-start worker if run directly
if (require.main === module) {
  startWorker();
}

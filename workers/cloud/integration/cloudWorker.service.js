/**
 * @module CloudWorkerService
 * @description Service for integrating with Modal.com cloud worker
 *
 * @requires axios
 *
 * @example
 * const { submitToCloudWorker, checkWorkerHealth } = require('./cloudWorker.service');
 *
 * const result = await submitToCloudWorker(jobData);
 *
 * @exports {Function} submitToCloudWorker - Submit job to cloud worker
 * @exports {Function} checkWorkerHealth - Check cloud worker health
 */

const axios = require('axios');

/**
 * Submit transcription job to Modal cloud worker
 *
 * @param {Object} jobData - Transcription job data
 * @param {string} jobData.transcriptionId - Unique transcription ID
 * @param {string} jobData.userId - User ID
 * @param {string} jobData.s3AudioUrl - S3 URL of audio file
 * @param {string} jobData.model - Whisper model (BASE, SMALL, MEDIUM)
 * @param {string} jobData.format - Output format (JSON, SRT, VTT, TXT)
 * @param {string} [jobData.callbackUrl] - Optional webhook URL for completion
 *
 * @returns {Promise<Object>} Result object
 * @throws {Error} If cloud worker URL not configured or request fails
 */
async function submitToCloudWorker(jobData) {
  const workerUrl = process.env.CLOUD_WORKER_URL;

  if (!workerUrl) {
    throw new Error('CLOUD_WORKER_URL not configured in environment');
  }

  // Validate job data
  if (!jobData.transcriptionId || !jobData.userId || !jobData.s3AudioUrl) {
    throw new Error('Missing required job data fields');
  }

  const validModels = ['BASE', 'SMALL', 'MEDIUM'];
  const validFormats = ['JSON', 'SRT', 'VTT', 'TXT'];

  if (!validModels.includes(jobData.model)) {
    throw new Error(`Invalid model: ${jobData.model}. Must be one of: ${validModels.join(', ')}`);
  }

  if (!validFormats.includes(jobData.format)) {
    throw new Error(`Invalid format: ${jobData.format}. Must be one of: ${validFormats.join(', ')}`);
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'cloud-worker-service',
    event: 'submit_job',
    data: {
      transcriptionId: jobData.transcriptionId,
      model: jobData.model,
      format: jobData.format
    }
  }));

  try {
    const response = await axios.post(
      workerUrl,
      jobData,
      {
        timeout: 60000, // 60 second timeout for submission
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'cloud-worker-service',
      event: 'job_submitted',
      data: {
        transcriptionId: jobData.transcriptionId,
        success: response.data.success
      }
    }));

    return response.data;

  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'cloud-worker-service',
      event: 'submit_failed',
      error: error.message,
      data: {
        transcriptionId: jobData.transcriptionId,
        status: error.response?.status,
        statusText: error.response?.statusText
      }
    }));

    // Re-throw with more context
    if (error.response) {
      throw new Error(`Cloud worker returned ${error.response.status}: ${error.response.data?.error || error.message}`);
    } else if (error.request) {
      throw new Error('Cloud worker did not respond - check CLOUD_WORKER_URL and network connectivity');
    } else {
      throw error;
    }
  }
}

/**
 * Check cloud worker health status
 *
 * @returns {Promise<Object>} Health status object
 * @throws {Error} If health check fails
 */
async function checkWorkerHealth() {
  const workerUrl = process.env.CLOUD_WORKER_URL;

  if (!workerUrl) {
    throw new Error('CLOUD_WORKER_URL not configured');
  }

  // Modal health check endpoint (if available)
  // You may need to adjust this based on your Modal deployment
  const healthUrl = workerUrl.replace('/transcribe-webhook', '/health');

  try {
    const response = await axios.get(healthUrl, {
      timeout: 10000
    });

    return {
      status: 'healthy',
      worker: 'cloud',
      timestamp: new Date().toISOString(),
      ...response.data
    };

  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'cloud-worker-service',
      event: 'health_check_failed',
      error: error.message
    }));

    return {
      status: 'unhealthy',
      worker: 'cloud',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get estimated cost for transcription
 *
 * @param {number} durationSeconds - Audio duration in seconds
 * @param {string} model - Whisper model (BASE, SMALL, MEDIUM)
 * @param {string} gpuType - GPU type (T4 or A10G)
 *
 * @returns {Object} Cost estimate
 */
function estimateCost(durationSeconds, model = 'BASE', gpuType = 'T4') {
  const gpuCosts = {
    T4: 0.60,    // per hour
    A10G: 1.10   // per hour
  };

  const processingSpeed = {
    BASE: 16,    // RTF (real-time factor)
    SMALL: 8,
    MEDIUM: 4
  };

  const hourlyRate = gpuCosts[gpuType] || gpuCosts.T4;
  const rtf = processingSpeed[model] || processingSpeed.BASE;

  // Calculate processing time
  const processingTimeSeconds = durationSeconds / rtf;
  const processingTimeHours = processingTimeSeconds / 3600;

  // Calculate cost
  const estimatedCost = processingTimeHours * hourlyRate;

  return {
    durationSeconds,
    model,
    gpuType,
    processingTimeSeconds: Math.round(processingTimeSeconds * 10) / 10,
    estimatedCostUSD: Math.round(estimatedCost * 1000) / 1000, // Round to 3 decimals
    hourlyRate: hourlyRate,
    realTimeFactor: rtf
  };
}

module.exports = {
  submitToCloudWorker,
  checkWorkerHealth,
  estimateCost
};

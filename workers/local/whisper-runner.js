/**
 * @module WhisperRunner
 * @description Wrapper for whisper.cpp CLI with Metal acceleration support
 *
 * @requires child_process
 * @requires path
 * @requires fs
 *
 * @example
 * const { runWhisper } = require('./whisper-runner');
 * const resultPath = await runWhisper('/path/to/audio.wav', 'BASE', 'JSON', (progress) => {
 *   console.log(`Progress: ${progress}%`);
 * });
 *
 * @exports {Function} runWhisper - Executes whisper.cpp and returns result file path
 * @exports {Function} validateWhisperSetup - Checks if whisper.cpp is properly installed
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Environment configuration
const WHISPER_PATH = process.env.WHISPER_PATH || path.join(__dirname, 'whisper.cpp/main');
const MODELS_PATH = process.env.MODELS_PATH || path.join(__dirname, 'whisper.cpp/models');

// Model file mappings
const MODEL_FILES = {
  BASE: 'ggml-base.bin',
  SMALL: 'ggml-small.bin',
  MEDIUM: 'ggml-medium.bin'
};

// Output format flags for whisper.cpp
const FORMAT_FLAGS = {
  JSON: '-oj',
  SRT: '-osrt',
  VTT: '-ovtt',
  TXT: '-otxt'
};

// Output file extensions
const FORMAT_EXTENSIONS = {
  JSON: 'json',
  SRT: 'srt',
  VTT: 'vtt',
  TXT: 'txt'
};

/**
 * Structured logging utility
 */
function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    module: 'whisper-runner',
    message,
    data
  }));
}

/**
 * Validates that whisper.cpp and required models are installed
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
async function validateWhisperSetup() {
  const errors = [];

  // Check if whisper binary exists
  if (!fs.existsSync(WHISPER_PATH)) {
    errors.push(`Whisper binary not found at ${WHISPER_PATH}`);
  } else {
    // Check if binary is executable
    try {
      fs.accessSync(WHISPER_PATH, fs.constants.X_OK);
    } catch (err) {
      errors.push(`Whisper binary at ${WHISPER_PATH} is not executable`);
    }
  }

  // Check if models directory exists
  if (!fs.existsSync(MODELS_PATH)) {
    errors.push(`Models directory not found at ${MODELS_PATH}`);
  } else {
    // Check if model files exist
    for (const [modelName, modelFile] of Object.entries(MODEL_FILES)) {
      const modelPath = path.join(MODELS_PATH, modelFile);
      if (!fs.existsSync(modelPath)) {
        errors.push(`Model file not found: ${modelPath} (${modelName})`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parses progress information from whisper.cpp stderr output
 * @param {string} line - Output line from whisper.cpp
 * @returns {number|null} Progress percentage (0-100) or null if not a progress line
 */
function parseProgress(line) {
  // whisper.cpp outputs progress in various formats:
  // "whisper_full_with_state: progress = 45%"
  // "[00:01:23.456 --> 00:01:25.789]  transcribed text"

  // Try to match percentage progress
  const percentMatch = line.match(/progress\s*=\s*(\d+)%/i);
  if (percentMatch) {
    return parseInt(percentMatch[1], 10);
  }

  // Try to estimate progress from timestamp
  const timestampMatch = line.match(/\[(\d{2}):(\d{2}):(\d{2})\.\d+\s*-->/);
  if (timestampMatch) {
    const hours = parseInt(timestampMatch[1], 10);
    const minutes = parseInt(timestampMatch[2], 10);
    const seconds = parseInt(timestampMatch[3], 10);
    const currentSeconds = hours * 3600 + minutes * 60 + seconds;

    // This is a rough estimate - we don't know total duration here
    // Return null to avoid inaccurate estimates
    return null;
  }

  return null;
}

/**
 * Runs whisper.cpp on an audio file
 * @param {string} audioPath - Path to input WAV file (16kHz, mono, PCM)
 * @param {'BASE'|'SMALL'|'MEDIUM'} model - Whisper model to use
 * @param {'JSON'|'SRT'|'VTT'|'TXT'} format - Output format
 * @param {Function} onProgress - Optional callback for progress updates (0-100)
 * @returns {Promise<string>} Path to output file
 * @throws {Error} If transcription fails
 */
async function runWhisper(audioPath, model = 'BASE', format = 'JSON', onProgress = null) {
  // Validate inputs
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  if (!MODEL_FILES[model]) {
    throw new Error(`Invalid model: ${model}. Must be one of: ${Object.keys(MODEL_FILES).join(', ')}`);
  }

  if (!FORMAT_FLAGS[format]) {
    throw new Error(`Invalid format: ${format}. Must be one of: ${Object.keys(FORMAT_FLAGS).join(', ')}`);
  }

  const modelPath = path.join(MODELS_PATH, MODEL_FILES[model]);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found: ${modelPath}`);
  }

  // Prepare output path
  const outputDir = path.dirname(audioPath);
  const outputBasename = path.basename(audioPath, path.extname(audioPath));
  const outputPath = path.join(outputDir, `${outputBasename}.${FORMAT_EXTENSIONS[format]}`);

  log('info', 'Starting Whisper transcription', {
    audioPath,
    model,
    format,
    modelPath,
    outputPath
  });

  return new Promise((resolve, reject) => {
    // Build whisper.cpp command arguments
    const args = [
      '-m', modelPath,           // Model file
      '-f', audioPath,           // Input audio file
      FORMAT_FLAGS[format],      // Output format flag
      '-of', path.join(outputDir, outputBasename), // Output file (without extension)
      '-t', '8',                 // Use 8 threads
      '-p', '1',                 // Number of processors (for Metal)
      '--print-progress'         // Print progress information
    ];

    // Add language parameter if specified in environment
    const language = process.env.WHISPER_LANGUAGE;
    if (language) {
      args.push('-l', language);
    }

    // Add translation flag if specified
    if (process.env.WHISPER_TRANSLATE === 'true') {
      args.push('--translate');
    }

    log('info', 'Executing whisper.cpp', { command: WHISPER_PATH, args });

    const child = spawn(WHISPER_PATH, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    let lastProgress = 0;
    let stderrOutput = '';
    let stdoutOutput = '';

    // Handle stdout
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutOutput += output;

      // Parse progress from stdout as well
      const lines = output.split('\n');
      for (const line of lines) {
        const progress = parseProgress(line);
        if (progress !== null && progress !== lastProgress) {
          lastProgress = progress;
          if (onProgress) {
            onProgress(progress);
          }
          log('info', 'Transcription progress', { progress, audioPath });
        }
      }
    });

    // Handle stderr (whisper.cpp outputs progress here)
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderrOutput += output;

      // Parse progress information
      const lines = output.split('\n');
      for (const line of lines) {
        const progress = parseProgress(line);
        if (progress !== null && progress !== lastProgress) {
          lastProgress = progress;
          if (onProgress) {
            onProgress(progress);
          }
          log('info', 'Transcription progress', { progress, audioPath });
        }
      }
    });

    // Handle process completion
    child.on('exit', (code, signal) => {
      if (code === 0) {
        // Check if output file was created
        if (fs.existsSync(outputPath)) {
          // Verify file has content
          const stats = fs.statSync(outputPath);
          if (stats.size === 0) {
            log('error', 'Whisper output file is empty', { outputPath });
            reject(new Error('Whisper produced empty output file'));
          } else {
            log('info', 'Whisper transcription completed successfully', {
              outputPath,
              fileSize: stats.size
            });
            // Report 100% progress
            if (onProgress && lastProgress < 100) {
              onProgress(100);
            }
            resolve(outputPath);
          }
        } else {
          log('error', 'Whisper output file not created', { outputPath, code });
          reject(new Error(`Whisper did not create output file: ${outputPath}`));
        }
      } else {
        const errorMessage = signal
          ? `Whisper process killed with signal ${signal}`
          : `Whisper process exited with code ${code}`;

        log('error', 'Whisper transcription failed', {
          code,
          signal,
          stderr: stderrOutput.slice(-500), // Last 500 chars
          stdout: stdoutOutput.slice(-500)
        });

        reject(new Error(`${errorMessage}\nStderr: ${stderrOutput.slice(-200)}`));
      }
    });

    // Handle process errors
    child.on('error', (err) => {
      log('error', 'Failed to start Whisper process', {
        error: err.message,
        whisperPath: WHISPER_PATH
      });
      reject(new Error(`Failed to start Whisper process: ${err.message}`));
    });

    // Set timeout (30 minutes max for very long files)
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      log('error', 'Whisper process timeout', { audioPath });
      reject(new Error('Whisper transcription timeout (30 minutes)'));
    }, 30 * 60 * 1000);

    child.on('exit', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Gets information about available models
 * @returns {Object} Object with model names and their file sizes
 */
function getModelInfo() {
  const modelInfo = {};

  for (const [modelName, modelFile] of Object.entries(MODEL_FILES)) {
    const modelPath = path.join(MODELS_PATH, modelFile);
    if (fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath);
      modelInfo[modelName] = {
        path: modelPath,
        size: stats.size,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2)
      };
    } else {
      modelInfo[modelName] = {
        path: modelPath,
        installed: false
      };
    }
  }

  return modelInfo;
}

module.exports = {
  runWhisper,
  validateWhisperSetup,
  getModelInfo,
  MODEL_FILES,
  FORMAT_FLAGS,
  FORMAT_EXTENSIONS
};

# Whisper Local Worker (Mac Mini)

High-performance transcription worker using whisper.cpp with Metal acceleration for Apple Silicon.

## Overview

This worker polls a BullMQ queue for transcription jobs and processes them locally using whisper.cpp optimized for Metal (Apple's GPU framework). It's designed to run on a Mac Mini with M-series chips for maximum performance.

## Features

- **Metal Acceleration**: Leverages Apple Silicon GPU for 2-5x faster transcription
- **Multiple Models**: Supports BASE, SMALL, and MEDIUM Whisper models
- **Multiple Formats**: Outputs JSON, SRT, VTT, or TXT formats
- **Progress Tracking**: Real-time progress updates via BullMQ
- **Auto Cleanup**: Manages temporary files and S3 retention
- **Robust Error Handling**: Comprehensive logging and error recovery
- **Graceful Shutdown**: Handles SIGTERM/SIGINT properly

## Prerequisites

- macOS 12.0 or later
- Mac with Apple Silicon (M1/M2/M3)
- Xcode Command Line Tools
- Node.js 20.x or later
- Redis server
- Homebrew (for installing ffmpeg)

## Installation

### Automated Installation

Run the installation script to set up everything automatically:

```bash
chmod +x install.sh
./install.sh
```

This will:
1. Check prerequisites
2. Install ffmpeg (via Homebrew)
3. Clone and compile whisper.cpp with Metal support
4. Download Whisper models (BASE, SMALL, MEDIUM)
5. Create temp directory
6. Install Node.js dependencies
7. Run validation tests
8. Create `.env.local` configuration file

### Manual Installation

If you prefer to install manually:

```bash
# 1. Install ffmpeg
brew install ffmpeg

# 2. Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp

# 3. Compile with Metal support
make clean
WHISPER_METAL=1 make -j

# 4. Download models
bash ./models/download-ggml-model.sh base
bash ./models/download-ggml-model.sh small
bash ./models/download-ggml-model.sh medium

# 5. Return to worker directory
cd ..

# 6. Install Node.js dependencies
npm install

# 7. Create temp directory
mkdir -p temp
```

## Configuration

### Environment Variables

Copy `.env.local` and configure:

```bash
# Whisper.cpp paths (auto-detected by install.sh)
WHISPER_PATH=/path/to/whisper.cpp/main
MODELS_PATH=/path/to/whisper.cpp/models

# Worker configuration
WORKER_CONCURRENCY=2              # Number of concurrent jobs (2 recommended)
TEMP_DIR=/path/to/temp            # Temporary file storage

# Redis connection
REDIS_URL=redis://localhost:6379  # Update with your Redis URL

# Logging
LOG_LEVEL=info                    # Options: info, warn, error

# Optional: Language
WHISPER_LANGUAGE=en               # Leave empty for auto-detect

# Optional: Translation
WHISPER_TRANSLATE=false           # Set to true to translate to English

# File retention
FILE_RETENTION_HOURS=24           # Hours to keep S3 files before cleanup
```

### Configuration Notes

- **WORKER_CONCURRENCY**: Set to 1-2 for Mac Mini. Higher values may cause memory issues.
- **TEMP_DIR**: Ensure you have sufficient disk space (500MB per job recommended)
- **WHISPER_LANGUAGE**: Use ISO 639-1 codes (en, es, fr, etc.). Leave empty for auto-detection.

## Usage

### Start Worker

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### Validate Setup

```bash
npm run validate
```

This checks:
- Whisper binary exists and is executable
- Models are downloaded
- ffmpeg is installed

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test

# Watch mode
npm run test:watch
```

## Architecture

### Processing Flow

```
1. Poll BullMQ queue for jobs
2. Download audio file from S3
3. Get audio duration (for usage tracking)
4. Convert to WAV (16kHz, mono, PCM)
5. Run whisper.cpp transcription
6. Upload result to S3
7. Update database (status, duration, result URL)
8. Record usage (minutes)
9. Schedule S3 cleanup
10. Delete local temp files
```

### File Structure

```
workers/local/
├── index.js                  # Main worker process
├── whisper-runner.js         # Whisper.cpp wrapper
├── install.sh                # Installation script
├── package.json              # Dependencies
├── README.md                 # This file
├── .env.local                # Environment config (create from install.sh)
├── temp/                     # Temporary files (auto-created)
├── whisper.cpp/              # Whisper.cpp repository (auto-cloned)
│   ├── main                  # Whisper binary
│   └── models/               # Model files
│       ├── ggml-base.bin
│       ├── ggml-small.bin
│       └── ggml-medium.bin
└── __tests__/                # Test files
    ├── index.test.js
    └── whisper-runner.test.js
```

## Models

### Available Models

| Model  | Size  | Speed      | Accuracy |
|--------|-------|------------|----------|
| BASE   | 142MB | ~1-2x RT   | Good     |
| SMALL  | 466MB | ~2-3x RT   | Better   |
| MEDIUM | 1.5GB | ~4-6x RT   | Best     |

RT = Real-time (e.g., 2x RT means 30min audio processes in 15min)

### Model Selection

Models are selected per-job via the API. The worker automatically uses the requested model.

## Output Formats

- **JSON**: Full transcription with timestamps and metadata
- **SRT**: SubRip subtitle format
- **VTT**: WebVTT subtitle format
- **TXT**: Plain text only

## Performance

### Expected Performance (Mac Mini M2)

- **BASE model**: 60min audio = ~30min processing
- **SMALL model**: 60min audio = ~20min processing
- **MEDIUM model**: 60min audio = ~10min processing

### Optimization Tips

1. **Use SMALL for most cases**: Best balance of speed/accuracy
2. **Reduce concurrency**: Lower WORKER_CONCURRENCY if experiencing memory issues
3. **SSD storage**: Use SSD for TEMP_DIR for faster I/O
4. **Close other apps**: Free up RAM for transcription

## Monitoring

### Log Output

Logs are structured JSON for easy parsing:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "module": "local-worker",
  "message": "Transcription job completed successfully",
  "data": {
    "jobId": "job-123",
    "transcriptionId": "trans-123",
    "durationSeconds": 125.5
  }
}
```

### Health Checks

Monitor worker health:

```bash
# Check if worker is running
ps aux | grep "node index.js"

# Check Redis connection
redis-cli ping

# Check disk space
df -h
```

## Troubleshooting

### Worker won't start

```bash
# Check Node.js version
node --version  # Should be 20.x or later

# Check Redis connection
redis-cli -u $REDIS_URL ping

# Validate setup
npm run validate
```

### Transcription fails

```bash
# Check whisper.cpp
./whisper.cpp/main --help

# Check ffmpeg
ffmpeg -version

# Check models
ls -lh whisper.cpp/models/*.bin

# Check logs for errors
grep -i error logs/*.log
```

### Out of memory errors

```bash
# Reduce concurrency in .env.local
WORKER_CONCURRENCY=1

# Check available memory
vm_stat

# Close other applications
```

### Slow transcription

```bash
# Verify Metal acceleration
./whisper.cpp/main --help | grep -i metal

# Check CPU/GPU usage
sudo powermetrics --samplers smc,gpu_power -i 1000 -n 10

# Try smaller model
# Change job model from MEDIUM to SMALL or BASE
```

### Temp files not cleaning up

```bash
# Manually clean temp directory
rm -f temp/*

# Check disk space
df -h temp/

# Verify cleanup code is running
grep "Cleaning up temp files" logs/*.log
```

## Integration

### With Backend Services

The worker integrates with:

- **Queue Service** (Task 5): Polls for jobs
- **S3 Service** (Task 2): Downloads/uploads files
- **Database** (Task 1): Updates transcription status
- **Usage Tracking**: Records minutes used

### Required Backend Modules

Ensure these modules are available:

```javascript
// From backend/src/services/s3.service.js
getDownloadUrl(s3Key)
uploadFile(s3Key, buffer, contentType)
scheduleCleanup(s3Key, hours)

// From backend/src/db/helpers.js
updateTranscriptionStatus(id, status, data)
recordUsage(userId, transcriptionId, minutes)
```

## Deployment

### Production Checklist

- [ ] Install.sh completed successfully
- [ ] Redis URL configured in .env.local
- [ ] Backend services accessible
- [ ] Sufficient disk space (10GB+ recommended)
- [ ] Process manager configured (PM2)
- [ ] Log rotation enabled
- [ ] Monitoring alerts configured

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start index.js --name whisper-worker

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs whisper-worker
```

### Tailscale Setup (Optional)

For remote access via Tailscale:

```bash
# Install Tailscale
brew install tailscale

# Start Tailscale
sudo tailscale up

# Get IP
tailscale ip -4
# Use this IP in WORKER_URL environment variable
```

## API Reference

### runWhisper

```javascript
const { runWhisper } = require('./whisper-runner');

/**
 * @param {string} audioPath - Path to WAV file
 * @param {'BASE'|'SMALL'|'MEDIUM'} model - Model to use
 * @param {'JSON'|'SRT'|'VTT'|'TXT'} format - Output format
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} Path to result file
 */
const resultPath = await runWhisper(
  '/tmp/audio.wav',
  'BASE',
  'JSON',
  (progress) => console.log(`${progress}%`)
);
```

### validateWhisperSetup

```javascript
const { validateWhisperSetup } = require('./whisper-runner');

const result = await validateWhisperSetup();
console.log(result);
// { valid: true, errors: [] }
```

### getModelInfo

```javascript
const { getModelInfo } = require('./whisper-runner');

const info = getModelInfo();
console.log(info);
// {
//   BASE: { path: '...', size: 142606336, sizeMB: '136.02' },
//   SMALL: { path: '...', size: 466330336, sizeMB: '444.74' },
//   MEDIUM: { path: '...', size: 1531885952, sizeMB: '1460.75' }
// }
```

## License

MIT

## Support

For issues specific to:
- **Whisper.cpp**: https://github.com/ggerganov/whisper.cpp/issues
- **This worker**: See main project repository
- **FFmpeg**: https://ffmpeg.org/documentation.html

## Credits

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) by Georgi Gerganov
- [OpenAI Whisper](https://github.com/openai/whisper) by OpenAI
- [BullMQ](https://github.com/taskforcesh/bullmq) for job queue

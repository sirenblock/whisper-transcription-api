# Queue Service - BullMQ Job Queue

> Task 5: Job Queue System for Whisper Transcription API

## Overview

BullMQ-based job queue service for managing transcription jobs. Supports priority-based processing, automatic retries, progress tracking, and seamless integration with both local and cloud workers.

## Features

- **Priority Queue**: Process PRO/PAYG jobs before FREE tier
- **Automatic Retries**: Exponential backoff for failed jobs
- **Progress Tracking**: Real-time progress updates
- **Job Management**: Cancel, retry, and monitor jobs
- **Worker Coordination**: Support for multiple concurrent workers
- **Metrics**: Queue statistics and monitoring
- **Graceful Shutdown**: Clean connection closure

## Installation

```bash
npm install bullmq ioredis @prisma/client
```

## Configuration

### Environment Variables

```bash
# Redis connection
REDIS_URL="redis://localhost:6379"

# Or with authentication
REDIS_URL="redis://:password@localhost:6379"

# For Redis Cluster
REDIS_URL="redis://localhost:6379,redis://localhost:6380"
```

## Usage

### Adding Jobs to Queue

```typescript
import { addTranscriptionJob, JOB_PRIORITIES } from './services/queue.service';

// Add a FREE tier job (priority: 1)
const jobId = await addTranscriptionJob({
  transcriptionId: 'trans_123',
  userId: 'user_123',
  s3AudioUrl: 'https://s3.amazonaws.com/bucket/audio.mp3',
  model: 'BASE',
  format: 'JSON',
});

// Add a PRO tier job (priority: 5)
const jobId = await addTranscriptionJob(jobData, JOB_PRIORITIES.PRO);

// Add a PAYG job (priority: 10)
const jobId = await addTranscriptionJob(jobData, JOB_PRIORITIES.PAYG);
```

### Checking Job Status

```typescript
import { getJobStatus } from './services/queue.service';

const status = await getJobStatus('job_123');

if (status) {
  console.log(`Status: ${status.status}`);
  console.log(`Progress: ${status.progress}%`);
  console.log(`Attempts: ${status.attemptsMade}`);

  if (status.failedReason) {
    console.log(`Error: ${status.failedReason}`);
  }
}
```

### Creating a Worker

**Option 1: Local Worker (Mac Mini)**

```typescript
// workers/local/index.ts
import { createWorker, TranscriptionJobResult } from '../../backend/src/services/queue.service';
import { processWithWhisperCpp } from './whisper-runner';

const worker = createWorker(async (job) => {
  const { transcriptionId, s3AudioUrl, model, format } = job.data;

  console.log(`Processing job ${job.id}...`);

  // Download audio from S3
  await job.updateProgress(10);
  const audioPath = await downloadFromS3(s3AudioUrl);

  // Run Whisper.cpp
  await job.updateProgress(30);
  const result = await processWithWhisperCpp(audioPath, model);

  // Upload result to S3
  await job.updateProgress(80);
  const s3ResultUrl = await uploadToS3(result, format);

  await job.updateProgress(100);

  return {
    s3ResultUrl,
    durationSeconds: result.duration,
    completedAt: new Date(),
  };
}, 2); // Process 2 jobs concurrently

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

**Option 2: Cloud Worker (Modal)**

```python
# workers/cloud/modal_worker.py
import modal
from bullmq import Worker

stub = modal.Stub("whisper-worker")

@stub.function(gpu="A10G")
def process_transcription(job_data):
    # Process with cloud GPU
    result = run_whisper(job_data["s3AudioUrl"])
    return {
        "s3ResultUrl": upload_result(result),
        "durationSeconds": result["duration"],
        "completedAt": datetime.now().isoformat()
    }

# Worker polls BullMQ queue
worker = Worker("transcription", process_transcription)
```

See full documentation for all API methods and examples.

## Testing

Run tests:

```bash
npm test services/__tests__/queue.test.ts
```

## Dependencies

```json
{
  "bullmq": "^4.0.0",
  "ioredis": "^5.3.0",
  "@prisma/client": "^5.0.0"
}
```

---

**Task 5 Complete** | Job Queue System with BullMQ

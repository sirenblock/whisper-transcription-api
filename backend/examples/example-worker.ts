/**
 * Example Worker - Demonstrates how to create a worker for processing transcription jobs
 *
 * This is a reference implementation for Tasks 6 & 7.
 *
 * Usage:
 *   npm run build
 *   node dist/examples/example-worker.js
 */

import { createWorker, TranscriptionJobResult } from '../src/services/queue.service';

/**
 * Mock function to simulate downloading from S3
 */
async function downloadFromS3(s3Url: string): Promise<string> {
  console.log(`  → Downloading audio from ${s3Url}`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate download
  return '/tmp/audio.mp3';
}

/**
 * Mock function to simulate transcription processing
 */
async function processTranscription(
  audioPath: string,
  model: string,
  format: string,
  onProgress: (progress: number) => void
): Promise<{ text: string; duration: number }> {
  console.log(`  → Processing with model: ${model}, format: ${format}`);

  // Simulate processing with progress updates
  for (let i = 0; i <= 100; i += 20) {
    onProgress(i);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    text: 'This is a mock transcription result.',
    duration: 120.5,
  };
}

/**
 * Mock function to simulate uploading to S3
 */
async function uploadToS3(result: any, transcriptionId: string, format: string): Promise<string> {
  console.log(`  → Uploading result for ${transcriptionId}`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
  const ext = format.toLowerCase();
  return `https://s3.example.com/results/${transcriptionId}.${ext}`;
}

/**
 * Main worker processor function
 */
async function processJob(job: any): Promise<TranscriptionJobResult> {
  const { transcriptionId, s3AudioUrl, model, format } = job.data;

  console.log(`\n[Worker] Processing job ${job.id}`);
  console.log(`  Transcription ID: ${transcriptionId}`);
  console.log(`  Model: ${model}`);
  console.log(`  Format: ${format}`);

  try {
    // Step 1: Download audio from S3 (0% -> 10%)
    await job.updateProgress(5);
    const audioPath = await downloadFromS3(s3AudioUrl);
    await job.updateProgress(10);

    // Step 2: Process transcription (10% -> 80%)
    const result = await processTranscription(audioPath, model, format, (progress) => {
      const scaledProgress = 10 + (progress * 0.7); // Scale to 10-80%
      job.updateProgress(Math.round(scaledProgress));
    });

    // Step 3: Upload result to S3 (80% -> 95%)
    await job.updateProgress(85);
    const s3ResultUrl = await uploadToS3(result, transcriptionId, format);
    await job.updateProgress(95);

    // Step 4: Complete (100%)
    await job.updateProgress(100);

    console.log(`[Worker] ✓ Job ${job.id} completed successfully`);

    return {
      s3ResultUrl,
      durationSeconds: result.duration,
      completedAt: new Date(),
    };
  } catch (error) {
    console.error(`[Worker] ✗ Job ${job.id} failed:`, error);
    throw error;
  }
}

/**
 * Create and start the worker
 */
function startWorker() {
  console.log('=================================================');
  console.log('       Example Worker - BullMQ Queue Service     ');
  console.log('=================================================\n');

  console.log('Configuration:');
  console.log(`  Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
  console.log(`  Concurrency: 2`);
  console.log(`  Queue: transcription\n`);

  // Create worker with concurrency of 2
  const worker = createWorker(processJob, 2);

  // Event: Job completed
  worker.on('completed', (job) => {
    console.log(`\n[Event] Job completed: ${job.id}`);
    console.log(`  Result: ${JSON.stringify(job.returnvalue, null, 2)}`);
  });

  // Event: Job failed
  worker.on('failed', (job, err) => {
    console.error(`\n[Event] Job failed: ${job?.id}`);
    console.error(`  Error: ${err.message}`);
  });

  // Event: Worker error
  worker.on('error', (err) => {
    console.error(`\n[Event] Worker error: ${err.message}`);
  });

  console.log('[Worker] Started and waiting for jobs...');
  console.log('[Worker] Press Ctrl+C to stop\n');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n[Worker] Shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n[Worker] Shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });
}

// Start the worker
if (require.main === module) {
  startWorker();
}

export { processJob, startWorker };

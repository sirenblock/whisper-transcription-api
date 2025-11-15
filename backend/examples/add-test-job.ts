/**
 * Add Test Job - Utility to add test jobs to the queue
 *
 * Usage:
 *   npm run build
 *   node dist/examples/add-test-job.js
 *   node dist/examples/add-test-job.js --model MEDIUM --priority 5
 */

import { addTranscriptionJob, getJobStatus, JOB_PRIORITIES } from '../src/services/queue.service';

interface TestJobOptions {
  model?: 'BASE' | 'SMALL' | 'MEDIUM';
  format?: 'JSON' | 'SRT' | 'VTT' | 'TXT';
  priority?: number;
  count?: number;
}

async function addTestJob(options: TestJobOptions = {}) {
  const {
    model = 'BASE',
    format = 'JSON',
    priority = JOB_PRIORITIES.FREE,
    count = 1,
  } = options;

  console.log('=================================================');
  console.log('       Add Test Job - BullMQ Queue Service       ');
  console.log('=================================================\n');

  console.log('Configuration:');
  console.log(`  Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
  console.log(`  Model: ${model}`);
  console.log(`  Format: ${format}`);
  console.log(`  Priority: ${priority}`);
  console.log(`  Count: ${count}\n`);

  try {
    for (let i = 0; i < count; i++) {
      const transcriptionId = `test-${Date.now()}-${i}`;

      console.log(`Adding job ${i + 1}/${count}...`);

      const jobId = await addTranscriptionJob(
        {
          transcriptionId,
          userId: 'test-user-123',
          s3AudioUrl: `https://example.com/audio/test-${i}.mp3`,
          model,
          format,
        },
        priority
      );

      console.log(`✓ Job added successfully!`);
      console.log(`  Transcription ID: ${transcriptionId}`);
      console.log(`  Job ID: ${jobId}`);

      // Check status
      const status = await getJobStatus(jobId);
      console.log(`  Status: ${status?.status || 'unknown'}`);
      console.log(`  Progress: ${status?.progress || 0}%\n`);

      // Small delay between jobs
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('=================================================');
    console.log(`✓ Successfully added ${count} job(s) to queue`);
    console.log('=================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error adding job:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): TestJobOptions {
  const args = process.argv.slice(2);
  const options: TestJobOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--model':
      case '-m':
        options.model = args[++i] as any;
        break;

      case '--format':
      case '-f':
        options.format = args[++i] as any;
        break;

      case '--priority':
      case '-p':
        options.priority = parseInt(args[++i], 10);
        break;

      case '--count':
      case '-c':
        options.count = parseInt(args[++i], 10);
        break;

      case '--help':
      case '-h':
        console.log(`
Usage: node add-test-job.js [options]

Options:
  -m, --model <model>        Whisper model (BASE, SMALL, MEDIUM) [default: BASE]
  -f, --format <format>      Output format (JSON, SRT, VTT, TXT) [default: JSON]
  -p, --priority <number>    Job priority (1-10) [default: 1]
  -c, --count <number>       Number of jobs to add [default: 1]
  -h, --help                 Show this help message

Examples:
  node add-test-job.js
  node add-test-job.js --model MEDIUM --priority 5
  node add-test-job.js --count 10 --format SRT
  node add-test-job.js -m SMALL -f VTT -p 10 -c 5
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  addTestJob(options);
}

export { addTestJob };

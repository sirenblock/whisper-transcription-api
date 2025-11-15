/**
 * @module DatabaseSeed
 * @description Seed script to populate database with test data
 *
 * Usage: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  console.log('Creating test users...');

  const testUserFree = await prisma.user.upsert({
    where: { email: 'test-free@example.com' },
    update: {},
    create: {
      email: 'test-free@example.com',
      plan: 'FREE',
      monthlyMinutesUsed: 15.5,
    },
  });
  console.log(`✅ Created FREE user: ${testUserFree.email}`);

  const testUserPro = await prisma.user.upsert({
    where: { email: 'test-pro@example.com' },
    update: {},
    create: {
      email: 'test-pro@example.com',
      plan: 'PRO',
      stripeCustomerId: 'cus_test_123456789',
      monthlyMinutesUsed: 200.25,
    },
  });
  console.log(`✅ Created PRO user: ${testUserPro.email}`);

  const testUserPayg = await prisma.user.upsert({
    where: { email: 'test-payg@example.com' },
    update: {},
    create: {
      email: 'test-payg@example.com',
      plan: 'PAYG',
      stripeCustomerId: 'cus_test_987654321',
      monthlyMinutesUsed: 450.75,
    },
  });
  console.log(`✅ Created PAYG user: ${testUserPayg.email}`);

  // Create test API keys
  console.log('\nCreating test API keys...');

  // Hash for: wtr_live_test_key_12345678901234567890
  const freeKeyHash = crypto
    .createHash('sha256')
    .update('wtr_live_test_key_12345678901234567890')
    .digest('hex');

  await prisma.apiKey.upsert({
    where: { keyHash: freeKeyHash },
    update: {},
    create: {
      userId: testUserFree.id,
      keyHash: freeKeyHash,
      name: 'Test Key - FREE',
    },
  });
  console.log(`✅ Created API key for FREE user: wtr_live_test_key_12345678901234567890`);

  // Hash for: wtr_live_pro_key_abcdefghijklmnopqrstu
  const proKeyHash = crypto
    .createHash('sha256')
    .update('wtr_live_pro_key_abcdefghijklmnopqrstu')
    .digest('hex');

  await prisma.apiKey.upsert({
    where: { keyHash: proKeyHash },
    update: {},
    create: {
      userId: testUserPro.id,
      keyHash: proKeyHash,
      name: 'Test Key - PRO',
    },
  });
  console.log(`✅ Created API key for PRO user: wtr_live_pro_key_abcdefghijklmnopqrstu`);

  // Create sample transcriptions
  console.log('\nCreating sample transcriptions...');

  // Completed transcription for PRO user
  const completedTranscription = await prisma.transcription.create({
    data: {
      userId: testUserPro.id,
      filename: 'sample-podcast-episode-01.mp3',
      model: 'SMALL',
      format: 'SRT',
      status: 'COMPLETED',
      durationSeconds: 1800, // 30 minutes
      progress: 100,
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      s3AudioUrl: 's3://whisper-audio/audio/sample-podcast-01.mp3',
      s3ResultUrl: 's3://whisper-audio/results/sample-podcast-01.srt',
      jobId: 'job_completed_12345',
    },
  });
  console.log(`✅ Created completed transcription: ${completedTranscription.id}`);

  // Processing transcription for PRO user
  const processingTranscription = await prisma.transcription.create({
    data: {
      userId: testUserPro.id,
      filename: 'interview-recording.wav',
      model: 'MEDIUM',
      format: 'JSON',
      status: 'PROCESSING',
      durationSeconds: 3600, // 60 minutes
      progress: 45,
      s3AudioUrl: 's3://whisper-audio/audio/interview-recording.wav',
      jobId: 'job_processing_67890',
    },
  });
  console.log(`✅ Created processing transcription: ${processingTranscription.id}`);

  // Queued transcription for FREE user
  const queuedTranscription = await prisma.transcription.create({
    data: {
      userId: testUserFree.id,
      filename: 'meeting-notes-2024.m4a',
      model: 'BASE',
      format: 'TXT',
      status: 'QUEUED',
      progress: 0,
      s3AudioUrl: 's3://whisper-audio/audio/meeting-notes.m4a',
      jobId: 'job_queued_11111',
    },
  });
  console.log(`✅ Created queued transcription: ${queuedTranscription.id}`);

  // Failed transcription for FREE user
  const failedTranscription = await prisma.transcription.create({
    data: {
      userId: testUserFree.id,
      filename: 'corrupted-audio.mp3',
      model: 'BASE',
      format: 'JSON',
      status: 'FAILED',
      progress: 0,
      errorMessage: 'Audio file is corrupted or invalid format',
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      s3AudioUrl: 's3://whisper-audio/audio/corrupted-audio.mp3',
      jobId: 'job_failed_99999',
    },
  });
  console.log(`✅ Created failed transcription: ${failedTranscription.id}`);

  // Create usage logs
  console.log('\nCreating usage logs...');

  await prisma.usageLog.createMany({
    data: [
      {
        userId: testUserPro.id,
        transcriptionId: completedTranscription.id,
        minutesUsed: 30.0,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        userId: testUserPro.id,
        transcriptionId: processingTranscription.id,
        minutesUsed: 60.0,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        userId: testUserFree.id,
        minutesUsed: 15.5,
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      },
      {
        userId: testUserPayg.id,
        minutesUsed: 120.0,
        timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
      },
    ],
  });
  console.log(`✅ Created usage logs`);

  // Summary
  console.log('\n📊 Seed Summary:');
  console.log('================');
  console.log(`Users created: 3`);
  console.log(`API keys created: 2`);
  console.log(`Transcriptions created: 4`);
  console.log(`Usage logs created: 4`);
  console.log('\n🔑 Test API Keys:');
  console.log('FREE tier: wtr_live_test_key_12345678901234567890');
  console.log('PRO tier:  wtr_live_pro_key_abcdefghijklmnopqrstu');
  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

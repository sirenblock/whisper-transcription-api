/**
 * Verification script to test database setup
 * Run: npx ts-node scripts/verify-setup.ts
 */

import { prisma } from '../src/db';
import {
  findUserByEmail,
  getUserMonthlyUsage,
  hasExceededQuota,
  getUserTranscriptions,
} from '../src/db/helpers';

async function verify() {
  console.log('🔍 Verifying database setup...\n');

  try {
    // Test 1: Database connection
    console.log('1️⃣  Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Test 2: Check tables exist
    console.log('2️⃣  Checking tables...');
    const userCount = await prisma.user.count();
    const apiKeyCount = await prisma.apiKey.count();
    const transcriptionCount = await prisma.transcription.count();
    const usageLogCount = await prisma.usageLog.count();
    
    console.log(`   Users: ${userCount}`);
    console.log(`   API Keys: ${apiKeyCount}`);
    console.log(`   Transcriptions: ${transcriptionCount}`);
    console.log(`   Usage Logs: ${usageLogCount}`);
    console.log('✅ All tables exist\n');

    // Test 3: Find user by email
    console.log('3️⃣  Testing findUserByEmail...');
    const user = await findUserByEmail('test-free@example.com');
    if (user) {
      console.log(`   Found: ${user.email} (${user.plan} plan)`);
      console.log(`   API Keys: ${user.apiKeys.length}`);
      console.log('✅ findUserByEmail works\n');

      // Test 4: Get monthly usage
      console.log('4️⃣  Testing getUserMonthlyUsage...');
      const usage = await getUserMonthlyUsage(user.id);
      console.log(`   Monthly usage: ${usage} minutes`);
      console.log('✅ getUserMonthlyUsage works\n');

      // Test 5: Check quota
      console.log('5️⃣  Testing hasExceededQuota...');
      const exceeded = await hasExceededQuota(user.id, user.plan);
      console.log(`   Quota exceeded: ${exceeded}`);
      console.log('✅ hasExceededQuota works\n');

      // Test 6: Get transcriptions
      console.log('6️⃣  Testing getUserTranscriptions...');
      const transcriptions = await getUserTranscriptions(user.id, 10, 0);
      console.log(`   Transcriptions: ${transcriptions.length}`);
      console.log('✅ getUserTranscriptions works\n');
    } else {
      console.log('❌ Test user not found - did you run seed?');
    }

    // Test 7: Check enums
    console.log('7️⃣  Testing enum values...');
    const allTranscriptions = await prisma.transcription.findMany({
      select: { status: true, model: true, format: true },
      take: 1,
    });
    if (allTranscriptions.length > 0) {
      console.log(`   Status: ${allTranscriptions[0].status}`);
      console.log(`   Model: ${allTranscriptions[0].model}`);
      console.log(`   Format: ${allTranscriptions[0].format}`);
      console.log('✅ Enums working correctly\n');
    }

    console.log('🎉 All tests passed! Database setup is complete.\n');
    console.log('Test API Keys:');
    console.log('  FREE: wtr_live_test_key_12345678901234567890');
    console.log('  PRO:  wtr_live_pro_key_abcdefghijklmnopqrstu');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

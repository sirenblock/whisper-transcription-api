#!/usr/bin/env node

/**
 * Cleanup script for old BullMQ jobs
 * Run with: npm run queue:cleanup
 */

const { cleanupOldJobs } = require('../dist/services/queue.service');

async function main() {
  console.log('Starting job cleanup...');
  
  try {
    await cleanupOldJobs();
    console.log('✓ Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Cleanup failed:', error);
    process.exit(1);
  }
}

main();

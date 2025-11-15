/**
 * Jest test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.API_KEY_PREFIX = 'wtr_test_';
process.env.API_KEY_LENGTH = '32';
process.env.MAX_KEYS_PER_USER = '10';
process.env.QUOTA_FREE = '60';
process.env.QUOTA_PRO = '600';
process.env.RATE_LIMIT_FREE = '3';
process.env.RATE_LIMIT_PRO = '20';
process.env.RATE_LIMIT_PAYG = '100';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Increase test timeout for integration tests
jest.setTimeout(10000);

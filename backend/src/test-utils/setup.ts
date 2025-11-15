/**
 * @module TestSetup
 * @description Global test setup and configuration
 */

// Mock environment variables for testing
process.env.STRIPE_SECRET_KEY = 'sk_test_mock123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock123';
process.env.STRIPE_PRICE_ID_PRO = 'price_pro123';
process.env.STRIPE_PRICE_ID_PAYG = 'price_payg123';
process.env.FRONTEND_URL = 'https://example.com';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
//   info: jest.fn(),
//   debug: jest.fn(),
// };

// Set timezone for consistent date handling
process.env.TZ = 'UTC';

// Increase test timeout if needed
jest.setTimeout(10000);

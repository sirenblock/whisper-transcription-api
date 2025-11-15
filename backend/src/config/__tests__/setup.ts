/**
 * @module TestSetup
 * @description Test setup for configuration module tests
 */

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Set test environment
process.env.NODE_ENV = 'test';

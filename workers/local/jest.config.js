/**
 * Jest configuration for Whisper Local Worker
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage directory
  coverageDirectory: 'coverage',

  // Collect coverage from these files
  collectCoverageFrom: [
    '*.js',
    '!index.js',              // Exclude main entry point (integration tested)
    '!jest.config.js',        // Exclude config
    '!coverage/**'            // Exclude coverage directory
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Test timeout (30 seconds for potentially slow operations)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Transform files (if using TypeScript or babel, configure here)
  // transform: {},

  // Module name mapper (for path aliases if needed)
  // moduleNameMapper: {},

  // Global setup/teardown
  // globalSetup: undefined,
  // globalTeardown: undefined,
};

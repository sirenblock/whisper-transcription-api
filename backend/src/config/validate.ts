/**
 * @module ConfigValidation
 * @description Validates configuration on application startup
 *
 * @example
 * import { validateConfig } from './validate';
 * validateConfig(config);
 *
 * @exports {Function} validateConfig - Validates configuration object
 * @exports {Function} validateWorkerConfig - Validates worker-specific configuration
 */

import type { Config } from './index';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates the complete application configuration
 * Throws on critical errors, warns on non-critical issues
 *
 * @param {Config} config - Configuration object to validate
 * @throws {Error} If required configuration is missing or invalid
 */
export function validateConfig(config: any): void {
  const errors: ValidationError[] = [];

  // Critical required fields
  const requiredFields = [
    { path: 'databaseUrl', message: 'DATABASE_URL is required' },
    { path: 's3.bucket', message: 'S3_BUCKET is required' },
    { path: 's3.accessKey', message: 'S3_ACCESS_KEY is required' },
    { path: 's3.secretKey', message: 'S3_SECRET_KEY is required' },
    { path: 'stripe.secretKey', message: 'STRIPE_SECRET_KEY is required' },
    { path: 'stripe.webhookSecret', message: 'STRIPE_WEBHOOK_SECRET is required' },
    { path: 'stripe.priceIdPro', message: 'STRIPE_PRICE_ID_PRO is required' },
  ];

  // Check required fields
  for (const { path, message } of requiredFields) {
    const value = getNestedValue(config, path);
    if (!value || value === 'undefined') {
      errors.push({ field: path, message, severity: 'error' });
    }
  }

  // Validate worker configuration
  const workerErrors = validateWorkerConfig(config.worker);
  errors.push(...workerErrors);

  // Validate numeric configurations
  validateNumericConfig(config, errors);

  // Validate file configuration
  validateFileConfig(config, errors);

  // Print results
  printValidationResults(errors);

  // Throw if critical errors exist
  const criticalErrors = errors.filter(e => e.severity === 'error');
  if (criticalErrors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${criticalErrors.map(e => `  - ${e.message}`).join('\n')}`
    );
  }
}

/**
 * Validates worker-specific configuration
 *
 * @param {object} workerConfig - Worker configuration object
 * @returns {ValidationError[]} Array of validation errors/warnings
 */
export function validateWorkerConfig(workerConfig: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate worker mode
  if (!['local', 'cloud'].includes(workerConfig.mode)) {
    errors.push({
      field: 'worker.mode',
      message: `Invalid WORKER_MODE: '${workerConfig.mode}'. Must be 'local' or 'cloud'`,
      severity: 'error',
    });
  }

  // Validate worker URLs
  if (workerConfig.mode === 'local') {
    if (!workerConfig.localUrl) {
      errors.push({
        field: 'worker.localUrl',
        message: 'WORKER_MODE=local but LOCAL_WORKER_URL is not set',
        severity: 'warning',
      });
    } else if (!isValidUrl(workerConfig.localUrl)) {
      errors.push({
        field: 'worker.localUrl',
        message: `LOCAL_WORKER_URL is not a valid URL: ${workerConfig.localUrl}`,
        severity: 'error',
      });
    }
  }

  if (workerConfig.mode === 'cloud') {
    if (!workerConfig.cloudUrl) {
      errors.push({
        field: 'worker.cloudUrl',
        message: 'WORKER_MODE=cloud but CLOUD_WORKER_URL is not set',
        severity: 'warning',
      });
    } else if (!isValidUrl(workerConfig.cloudUrl)) {
      errors.push({
        field: 'worker.cloudUrl',
        message: `CLOUD_WORKER_URL is not a valid URL: ${workerConfig.cloudUrl}`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validates numeric configuration values
 *
 * @param {Config} config - Configuration object
 * @param {ValidationError[]} errors - Array to push errors to
 */
function validateNumericConfig(config: any, errors: ValidationError[]): void {
  // Validate port
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push({
      field: 'port',
      message: `Invalid PORT: ${config.port}. Must be between 1-65535`,
      severity: 'error',
    });
  }

  // Validate rate limits
  const rateLimits = [
    { field: 'rateLimit.free', value: config.rateLimit.free },
    { field: 'rateLimit.pro', value: config.rateLimit.pro },
    { field: 'rateLimit.payg', value: config.rateLimit.payg },
  ];

  for (const { field, value } of rateLimits) {
    if (isNaN(value) || value < 0) {
      errors.push({
        field,
        message: `Invalid ${field}: ${value}. Must be a positive number`,
        severity: 'error',
      });
    }
  }

  // Validate quotas
  if (isNaN(config.quota.free) || config.quota.free < 0) {
    errors.push({
      field: 'quota.free',
      message: `Invalid QUOTA_FREE: ${config.quota.free}. Must be a positive number`,
      severity: 'error',
    });
  }

  if (isNaN(config.quota.pro) || config.quota.pro < 0) {
    errors.push({
      field: 'quota.pro',
      message: `Invalid QUOTA_PRO: ${config.quota.pro}. Must be a positive number`,
      severity: 'error',
    });
  }
}

/**
 * Validates file configuration
 *
 * @param {Config} config - Configuration object
 * @param {ValidationError[]} errors - Array to push errors to
 */
function validateFileConfig(config: any, errors: ValidationError[]): void {
  // Validate file size
  if (isNaN(config.file.maxSizeMB) || config.file.maxSizeMB < 1) {
    errors.push({
      field: 'file.maxSizeMB',
      message: `Invalid MAX_FILE_SIZE_MB: ${config.file.maxSizeMB}. Must be >= 1`,
      severity: 'error',
    });
  }

  // Validate allowed formats
  if (!Array.isArray(config.file.allowedFormats) || config.file.allowedFormats.length === 0) {
    errors.push({
      field: 'file.allowedFormats',
      message: 'ALLOWED_FORMATS must contain at least one format',
      severity: 'error',
    });
  }

  // Validate retention hours
  if (isNaN(config.file.retentionHours) || config.file.retentionHours < 1) {
    errors.push({
      field: 'file.retentionHours',
      message: `Invalid FILE_RETENTION_HOURS: ${config.file.retentionHours}. Must be >= 1`,
      severity: 'error',
    });
  }
}

/**
 * Prints validation results to console
 *
 * @param {ValidationError[]} errors - Array of validation errors
 */
function printValidationResults(errors: ValidationError[]): void {
  const criticalErrors = errors.filter(e => e.severity === 'error');
  const warnings = errors.filter(e => e.severity === 'warning');

  if (errors.length === 0) {
    console.log('✓ Configuration validated successfully');
    return;
  }

  if (criticalErrors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    criticalErrors.forEach(e => console.error(`   - ${e.message}`));
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(e => console.warn(`   - ${e.message}`));
  }

  if (criticalErrors.length === 0) {
    console.log('\n✓ Configuration validated (with warnings)');
  }
}

/**
 * Gets nested value from object using dot notation
 *
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot-notation path (e.g., 's3.bucket')
 * @returns {any} Value at path, or undefined
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Validates if a string is a valid URL
 *
 * @param {string} url - URL string to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates environment-specific configuration
 * Ensures production environments have secure settings
 *
 * @param {Config} config - Configuration object
 */
export function validateProductionConfig(config: any): void {
  if (!config.isProduction) return;

  const productionErrors: ValidationError[] = [];

  // Ensure HTTPS in production
  if (config.worker.activeUrl && !config.worker.activeUrl.startsWith('https://')) {
    productionErrors.push({
      field: 'worker.activeUrl',
      message: 'Worker URL must use HTTPS in production',
      severity: 'error',
    });
  }

  // Ensure Redis URL is not localhost
  if (config.redisUrl.includes('localhost') || config.redisUrl.includes('127.0.0.1')) {
    productionErrors.push({
      field: 'redisUrl',
      message: 'REDIS_URL should not be localhost in production',
      severity: 'warning',
    });
  }

  // Ensure database URL is not localhost
  if (config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1')) {
    productionErrors.push({
      field: 'databaseUrl',
      message: 'DATABASE_URL should not be localhost in production',
      severity: 'error',
    });
  }

  // Check for test Stripe keys
  if (config.stripe.secretKey.startsWith('sk_test_')) {
    productionErrors.push({
      field: 'stripe.secretKey',
      message: 'Using test Stripe key in production',
      severity: 'warning',
    });
  }

  if (productionErrors.length > 0) {
    printValidationResults(productionErrors);
  }
}

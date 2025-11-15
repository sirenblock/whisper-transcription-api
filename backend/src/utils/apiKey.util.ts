/**
 * @module ApiKeyUtil
 * @description Utilities for generating, hashing, and validating API keys
 *
 * @requires crypto
 * @requires @prisma/client
 *
 * @example
 * const { plainKey } = await generateApiKey('user-id-123', 'My API Key');
 * // Returns: { id: 'key-id', plainKey: 'wtr_live_...', name: 'My API Key', createdAt: Date }
 *
 * @exports {Function} generateApiKey - Generate new API key for a user
 * @exports {Function} hashApiKey - Hash an API key for secure lookup
 * @exports {Function} isValidKeyFormat - Validate API key format
 */

import crypto from 'crypto';
import { prisma } from '../db';

const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'wtr_live_';
const API_KEY_LENGTH = parseInt(process.env.API_KEY_LENGTH || '32');

export interface GeneratedApiKey {
  id: string;
  plainKey: string;
  name: string | null;
  createdAt: Date;
}

/**
 * Generate a new API key for a user
 *
 * @param userId - The user ID to associate the key with
 * @param name - Optional name for the API key
 * @returns Object containing the plain API key (show once!) and metadata
 *
 * @example
 * const result = await generateApiKey('user-123', 'Production Key');
 * // result.plainKey = 'wtr_live_a3f2c1...' (64 chars total)
 * // WARNING: plainKey is only returned once - store it securely!
 */
export async function generateApiKey(
  userId: string,
  name?: string
): Promise<GeneratedApiKey> {
  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const plainKey = API_KEY_PREFIX + randomBytes.toString('hex').slice(0, API_KEY_LENGTH);

  // Hash the key for secure storage (never store plain keys)
  const keyHash = hashApiKey(plainKey);

  // Store in database
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      keyHash,
      name: name || `Key ${new Date().toISOString()}`,
    },
  });

  return {
    id: apiKey.id,
    plainKey, // ⚠️ Show this ONCE to user - cannot be recovered
    name: apiKey.name,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Hash an API key using SHA-256 for secure database lookup
 *
 * @param plainKey - The plain text API key
 * @returns SHA-256 hash of the key
 *
 * @example
 * const hash = hashApiKey('wtr_live_abc123...');
 * // Returns: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
 */
export function hashApiKey(plainKey: string): string {
  return crypto
    .createHash('sha256')
    .update(plainKey)
    .digest('hex');
}

/**
 * Validate that an API key matches the expected format
 *
 * @param key - The API key to validate
 * @returns True if the key format is valid
 *
 * @example
 * isValidKeyFormat('wtr_live_' + 'a'.repeat(32)); // true
 * isValidKeyFormat('invalid_key'); // false
 * isValidKeyFormat('wtr_live_tooshort'); // false
 */
export function isValidKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const expectedLength = API_KEY_PREFIX.length + API_KEY_LENGTH;
  return key.startsWith(API_KEY_PREFIX) && key.length === expectedLength;
}

/**
 * Delete an API key by its ID
 *
 * @param keyId - The API key ID to delete
 * @param userId - The user ID (for authorization check)
 * @returns True if deleted, false if not found or unauthorized
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  try {
    const result = await prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId, // Ensure user owns this key
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error('Error deleting API key:', error);
    return false;
  }
}

/**
 * List all API keys for a user (without hashes)
 *
 * @param userId - The user ID
 * @returns Array of API key metadata (no hashes or plain keys)
 */
export async function listUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      createdAt: true,
      // Explicitly exclude keyHash for security
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

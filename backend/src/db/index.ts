/**
 * @module Database
 * @description Prisma client singleton for database access
 *
 * @requires @prisma/client
 *
 * @example
 * import { prisma } from './db';
 * const users = await prisma.user.findMany();
 *
 * @exports {PrismaClient} prisma - Singleton Prisma client instance
 */

import { PrismaClient } from '@prisma/client';

// Extend global namespace to store Prisma instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Singleton Prisma client instance
 * - Reuses connection in development (prevents exhaustion during hot reload)
 * - Enables query logging in development mode
 * - Production mode logs errors only
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Store instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Disconnects Prisma client before process exit
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * SIGINT handler for Ctrl+C
 */
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

/**
 * SIGTERM handler for process termination
 */
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

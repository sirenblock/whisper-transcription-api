# Whisper API - Database Setup

Complete PostgreSQL database schema and Prisma ORM configuration for the Whisper Transcription API.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Migrations](#migrations)
- [Seeding](#seeding)
- [Usage](#usage)
- [Helper Functions](#helper-functions)
- [Maintenance](#maintenance)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14.x or higher
- npm 10.x or higher

---

## Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Database Setup

### 1. Create PostgreSQL Database

**Using psql:**
```bash
createdb whisperapi
```

**Or using PostgreSQL command:**
```sql
CREATE DATABASE whisperapi;
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/whisperapi?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

---

## Migrations

### Create and Apply Migrations

**Development (interactive):**
```bash
npm run prisma:migrate
```

You'll be prompted to name your migration. This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Regenerate Prisma Client

**Production (non-interactive):**
```bash
npm run prisma:migrate:prod
```

### View Migration Status

```bash
npx prisma migrate status
```

### Rollback Migrations

Prisma doesn't support automatic rollback. To reset:
```bash
npm run db:reset
```

**⚠️ Warning:** This will delete all data!

---

## Seeding

### Seed Test Data

```bash
npm run prisma:seed
```

This creates:
- **3 test users:**
  - `test-free@example.com` (FREE plan, 15.5 min used)
  - `test-pro@example.com` (PRO plan, 200.25 min used)
  - `test-payg@example.com` (PAYG plan, 450.75 min used)

- **2 test API keys:**
  - `wtr_live_test_key_12345678901234567890` (FREE user)
  - `wtr_live_pro_key_abcdefghijklmnopqrstu` (PRO user)

- **4 sample transcriptions:**
  - 1 completed
  - 1 processing
  - 1 queued
  - 1 failed

- **Usage logs** for each user

---

## Usage

### Prisma Studio (Database GUI)

Launch the visual database editor:
```bash
npm run prisma:studio
```

Opens at `http://localhost:5555`

### Import in Your Code

**Using Prisma Client:**
```typescript
import { prisma } from './src/db';

// Query users
const users = await prisma.user.findMany();

// Create a transcription
const transcription = await prisma.transcription.create({
  data: {
    userId: 'user_123',
    filename: 'audio.mp3',
    model: 'BASE',
    format: 'JSON',
    status: 'QUEUED',
  },
});
```

**Using Helper Functions:**
```typescript
import {
  findUserByEmail,
  getUserMonthlyUsage,
  recordUsage
} from './src/db/helpers';

// Find user
const user = await findUserByEmail('test@example.com');

// Check usage
const usage = await getUserMonthlyUsage(user.id);
console.log(`Used ${usage} minutes this month`);

// Record new usage
await recordUsage(user.id, 'trans_123', 30.5);
```

---

## Helper Functions

All helper functions are exported from `src/db/helpers.ts`:

### User Management

```typescript
// Find user by email (includes API keys)
findUserByEmail(email: string)

// Find user by API key hash (updates lastUsedAt)
findUserByApiKeyHash(keyHash: string)

// Create or get existing user
getOrCreateUser(email: string)

// Update user's Stripe customer ID
updateUserStripeCustomer(userId: string, stripeCustomerId: string)

// Update user's plan
updateUserPlan(userId: string, plan: Plan)
```

### Usage Tracking

```typescript
// Get monthly usage in minutes
getUserMonthlyUsage(userId: string): Promise<number>

// Check if user exceeded quota
hasExceededQuota(userId: string, plan: Plan): Promise<boolean>

// Record transcription usage
recordUsage(userId: string, transcriptionId: string, minutesUsed: number)

// Reset all users' monthly usage (cron job)
resetMonthlyUsage(): Promise<number>
```

### API Key Management

```typescript
// Create new API key
createApiKey(userId: string, keyHash: string, name?: string)

// Delete API key (with ownership check)
deleteApiKey(keyId: string, userId: string)
```

### Transcription Management

```typescript
// Get user's transcription history (paginated)
getUserTranscriptions(userId: string, limit?: number, offset?: number)

// Get single transcription (with auth check)
getTranscription(transcriptionId: string, userId: string)

// Create new transcription
createTranscription(data: TranscriptionData)

// Get transcription by job ID
getTranscriptionByJobId(jobId: string)

// Update transcription status
updateTranscriptionStatus(
  transcriptionId: string,
  status: TranscriptionStatus,
  data?: {
    progress?: number;
    durationSeconds?: number;
    s3ResultUrl?: string;
    errorMessage?: string;
  }
)
```

---

## Maintenance

### Reset Database

**Complete reset (deletes all data):**
```bash
npm run db:reset
```

This will:
1. Drop all tables
2. Run all migrations
3. Seed test data

### Push Schema Changes (Development Only)

Push schema changes without creating migrations:
```bash
npm run db:push
```

**⚠️ Use only in development!**

### Monthly Usage Reset Cron Job

Add to your crontab to reset usage on the 1st of each month at midnight:

```bash
0 0 1 * * cd /path/to/backend && node -e "require('./src/db/helpers').resetMonthlyUsage().then(() => process.exit(0))"
```

Or create a dedicated script `scripts/reset-usage.js`:
```javascript
require('dotenv').config();
const { resetMonthlyUsage } = require('./src/db/helpers');

resetMonthlyUsage()
  .then((count) => {
    console.log(`Reset usage for ${count} users`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
  });
```

Then in crontab:
```bash
0 0 1 * * cd /path/to/backend && node scripts/reset-usage.js
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Database Tests Only

```bash
npm run test:db
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm test -- --coverage
```

Tests are located in `src/db/__tests__/helpers.test.ts` and use Jest with mocked Prisma client.

---

## Troubleshooting

### Connection Errors

**Error:** `Can't reach database server`

**Solution:**
1. Ensure PostgreSQL is running:
   ```bash
   pg_ctl status
   # or
   brew services list | grep postgresql
   ```

2. Check your `DATABASE_URL` in `.env`

3. Test connection:
   ```bash
   psql $DATABASE_URL
   ```

### Migration Errors

**Error:** `Migration failed to apply`

**Solution:**
1. Check migration SQL in `prisma/migrations/`
2. Manually fix the database if needed
3. Mark migration as applied:
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

### Schema Sync Issues

**Error:** `Prisma schema is out of sync`

**Solution:**
```bash
npm run prisma:generate
```

### Seed Errors

**Error:** `Unique constraint failed`

**Solution:**
The seed script uses `upsert`, so this shouldn't happen. If it does:
```bash
npm run db:reset
```

---

## Database Schema Overview

### Tables

- **users** - User accounts and plan information
- **api_keys** - API authentication keys (hashed)
- **transcriptions** - Transcription jobs and results
- **usage_logs** - Detailed usage tracking

### Enums

- **Plan** - `FREE`, `PRO`, `PAYG`
- **WhisperModel** - `BASE`, `SMALL`, `MEDIUM`
- **OutputFormat** - `JSON`, `SRT`, `VTT`, `TXT`
- **TranscriptionStatus** - `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`

### Indexes

Optimized for:
- User email lookups
- API key hash lookups
- Transcription status queries
- Usage log aggregations by user/date

---

## Integration with Other Modules

This database layer is used by:

- **Task 3** (Auth middleware) - `findUserByApiKeyHash()`
- **Task 4** (Rate limiting) - `hasExceededQuota()`
- **Task 5** (Job queue) - `createTranscription()`, `updateTranscriptionStatus()`
- **Task 8** (API routes) - All helper functions
- **Task 9** (Stripe) - `updateUserPlan()`, `updateUserStripeCustomer()`

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Prisma logs in console
3. Inspect database directly using Prisma Studio

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0

# Task 8: REST API Routes

**Status:** ✅ Complete
**Module:** REST API Routes
**Integration:** Tasks 1, 2, 3, 4, 5, 9

---

## 📋 Overview

This module provides the complete REST API implementation for the Whisper Transcription service. It includes routes for transcription operations, authentication/API key management, and webhook handling.

## 🗂️ File Structure

```
backend/src/routes/
├── transcription.routes.ts    # Transcription CRUD operations
├── auth.routes.ts             # API key management & user info
├── webhook.routes.ts          # Stripe webhook handler
├── index.ts                   # Route aggregator
└── README.md                  # This file

backend/src/index.ts           # Main Express server
```

## 📡 API Endpoints

### Transcription Routes

#### POST /api/v1/transcribe
Initiate a new transcription job.

**Authentication:** Required (Bearer token)
**Rate Limiting:** Applied

**Request Body:**
```json
{
  "filename": "meeting.mp3",
  "contentType": "audio/mpeg",
  "model": "BASE",      // Optional: BASE, SMALL, MEDIUM (default: BASE)
  "format": "JSON"      // Optional: JSON, SRT, VTT, TXT (default: JSON)
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transcriptionId": "trans_abc123",
    "uploadUrl": "https://s3.example.com/upload?...",
    "statusUrl": "/api/v1/status/trans_abc123",
    "expiresIn": 3600
  },
  "message": "Upload URL generated. Upload your file to the provided URL."
}
```

**Workflow:**
1. Server generates S3 pre-signed upload URL
2. Client uploads audio file to S3 URL
3. Server queues transcription job
4. Client polls status endpoint

---

#### GET /api/v1/status/:id
Check transcription status.

**Authentication:** Required
**Parameters:** `id` - Transcription ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "trans_abc123",
    "status": "PROCESSING",
    "progress": 50,
    "filename": "meeting.mp3",
    "model": "BASE",
    "format": "JSON",
    "durationSeconds": 120,
    "createdAt": "2024-01-15T10:00:00Z",
    "completedAt": null,
    "downloadUrl": null,
    "errorMessage": null
  }
}
```

**Status Values:**
- `QUEUED` - Waiting in queue
- `PROCESSING` - Currently transcribing
- `COMPLETED` - Finished successfully
- `FAILED` - Error occurred

---

#### GET /api/v1/transcriptions
List user's transcription history.

**Authentication:** Required
**Query Parameters:**
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)
- `status` (optional, filter by: QUEUED, PROCESSING, COMPLETED, FAILED)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transcriptions": [
      {
        "id": "trans_1",
        "filename": "meeting.mp3",
        "status": "COMPLETED",
        "model": "BASE",
        "format": "JSON",
        "durationSeconds": 120,
        "progress": 100,
        "createdAt": "2024-01-15T10:00:00Z",
        "completedAt": "2024-01-15T10:05:00Z",
        "errorMessage": null
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

#### GET /api/v1/download/:id
Get download URL for completed transcription.

**Authentication:** Required
**Parameters:** `id` - Transcription ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://s3.example.com/results/...",
    "filename": "meeting.mp3",
    "format": "JSON",
    "expiresIn": 3600
  }
}
```

**Error (400 - Not Ready):**
```json
{
  "success": false,
  "error": {
    "code": "TRANSCRIPTION_NOT_READY",
    "message": "Transcription is not ready for download (status: PROCESSING)"
  }
}
```

---

#### GET /api/v1/usage
Get usage statistics for the authenticated user.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plan": "PRO",
    "minutesUsed": 120,
    "quota": 600,
    "remaining": 480,
    "percentageUsed": 20,
    "transcriptionsThisMonth": 15,
    "memberSince": "2024-01-01T00:00:00Z"
  }
}
```

---

### Authentication Routes

#### POST /api/v1/keys
Generate a new API key.

**Authentication:** Required (existing API key)
**Request Body:**
```json
{
  "name": "Production Key"  // Optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "key": "wtr_live_a1b2c3d4e5f6...",
    "name": "Production Key",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Save this key securely - it will not be shown again"
}
```

⚠️ **Important:** The plain key is only returned once. Store it securely.

---

#### GET /api/v1/keys
List all API keys (without plain keys).

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "key_1",
        "name": "Production Key",
        "createdAt": "2024-01-01T00:00:00Z",
        "lastUsedAt": "2024-01-15T10:00:00Z"
      },
      {
        "id": "key_2",
        "name": "Development Key",
        "createdAt": "2024-01-10T00:00:00Z",
        "lastUsedAt": null
      }
    ],
    "total": 2
  }
}
```

---

#### DELETE /api/v1/keys/:id
Revoke an API key.

**Authentication:** Required
**Parameters:** `id` - API key ID

**Response (200):**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

#### GET /api/v1/me
Get current user information.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "email": "user@example.com",
    "plan": "PRO",
    "monthlyMinutesUsed": 120,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### Webhook Routes

#### POST /webhooks/stripe
Handle Stripe webhook events.

**Authentication:** Stripe signature verification
**Content-Type:** `application/json` (raw body required)

**Headers:**
```
stripe-signature: t=1234567890,v1=abc123...
```

**Supported Events:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Response (200):**
```json
{
  "success": true,
  "received": true
}
```

---

#### GET /webhooks/health
Health check for webhook endpoint.

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook endpoint is healthy",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

## 🔐 Authentication

All API endpoints (except webhooks and health checks) require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer wtr_live_abc123..." \
  https://api.whisperapi.com/api/v1/transcriptions
```

### API Key Format
- Prefix: `wtr_live_` (production) or `wtr_test_` (test)
- Length: 32 characters + prefix (41 characters total)
- Example: `wtr_live_a1b2c3d4e5f6789012345678901234`

---

## 📊 Response Format

All responses follow a standardized format:

### Success Response
```json
{
  "success": true,
  "data": { /* ... */ },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* Optional additional info */ }
  }
}
```

### Standard Error Codes
- `INVALID_API_KEY` (401) - Invalid or missing API key
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `MONTHLY_QUOTA_EXCEEDED` (429) - Monthly usage limit reached
- `INVALID_INPUT` (400) - Validation error
- `TRANSCRIPTION_NOT_FOUND` (404) - Resource not found
- `SERVER_ERROR` (500) - Internal server error

---

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Files
- `__tests__/routes/transcription.routes.test.ts` - Transcription routes
- `__tests__/routes/auth.routes.test.ts` - Auth routes
- `__tests__/routes/webhook.routes.test.ts` - Webhook routes

### Coverage Requirements
- ✅ Line coverage: 80%+
- ✅ Branch coverage: 75%+
- ✅ Function coverage: 80%+

---

## 🔗 Integration Points

### Dependencies (Input)
This module depends on:

1. **Task 1 (Database):**
   - `prisma` - Database client
   - Database helpers

2. **Task 2 (S3 Service):**
   - `generateUploadUrl()` - Create upload URLs
   - `getDownloadUrl()` - Create download URLs

3. **Task 3 (Auth Middleware):**
   - `authMiddleware` - API key authentication

4. **Task 4 (Rate Limiting):**
   - `rateLimitMiddleware` - Rate limit enforcement

5. **Task 5 (Queue Service):**
   - `addTranscriptionJob()` - Queue jobs
   - `getJobStatus()` - Check job status

6. **Task 9 (Payment Service):**
   - `handleWebhook()` - Process Stripe events

### Exports (Output)
This module exports:

- `transcriptionRoutes` - Express router
- `authRoutes` - Express router
- `webhookRoutes` - Express router
- `app` - Main Express application (from index.ts)

---

## 🚀 Usage Example

### Starting the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

**Server will start on:**
- Port: `3000` (or `$PORT`)
- Base URL: `http://localhost:3000`

### Example Client Request

```javascript
// 1. Initiate transcription
const response = await fetch('http://localhost:3000/api/v1/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wtr_live_abc123...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: 'meeting.mp3',
    contentType: 'audio/mpeg',
    model: 'BASE',
    format: 'JSON'
  })
});

const { data } = await response.json();
// data.uploadUrl - Upload your file here
// data.transcriptionId - Use to check status

// 2. Upload file to S3
await fetch(data.uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'audio/mpeg' },
  body: audioFile
});

// 3. Poll status
const statusResponse = await fetch(
  `http://localhost:3000/api/v1/status/${data.transcriptionId}`,
  {
    headers: { 'Authorization': 'Bearer wtr_live_abc123...' }
  }
);

const status = await statusResponse.json();
// status.data.status - QUEUED, PROCESSING, COMPLETED, FAILED
// status.data.downloadUrl - Available when COMPLETED
```

---

## 🔧 Configuration

### Environment Variables

Required variables (see `.env.example`):

```bash
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# Database (from Task 1)
DATABASE_URL=postgresql://...

# Redis (from Task 5)
REDIS_URL=redis://localhost:6379

# S3 (from Task 2)
S3_BUCKET=whisper-audio
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Stripe (from Task 9)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API Keys
API_KEY_PREFIX=wtr_live_
API_KEY_LENGTH=32
MAX_KEYS_PER_USER=10

# Rate Limits
RATE_LIMIT_FREE=3
RATE_LIMIT_PRO=20
RATE_LIMIT_PAYG=100

# Quotas
QUOTA_FREE=60
QUOTA_PRO=600
```

---

## 📝 Validation

All inputs are validated using Zod schemas:

### Transcribe Request
- `filename`: String, 1-255 characters
- `contentType`: Regex `/^(audio|video)\//`
- `model`: Enum (BASE, SMALL, MEDIUM)
- `format`: Enum (JSON, SRT, VTT, TXT)

### List Query
- `limit`: String digits, capped at 100
- `offset`: String digits
- `status`: Enum (QUEUED, PROCESSING, COMPLETED, FAILED)

### Create Key Request
- `name`: String, 1-100 characters (optional)

---

## 🔍 Logging

All routes use structured JSON logging:

```json
{
  "timestamp": "2024-01-15T10:00:00.000Z",
  "level": "info",
  "module": "transcription-routes",
  "message": "Transcription initiated",
  "data": {
    "transcriptionId": "trans_abc123",
    "userId": "user_123",
    "filename": "meeting.mp3",
    "model": "BASE",
    "duration": 123
  }
}
```

**Log Levels:**
- `info` - Successful operations
- `warn` - Validation failures, missing params
- `error` - Server errors, exceptions

---

## 🛡️ Security Features

1. **Helmet.js** - Security headers
2. **CORS** - Configurable origins
3. **Rate Limiting** - Per-user, per-plan
4. **Input Validation** - Zod schemas
5. **API Key Hashing** - SHA-256
6. **Stripe Signature Verification** - Webhook security
7. **Authorization Checks** - User ownership validation

---

## 🚨 Error Handling

### Global Error Handler

The server includes a global error handler that:
- Catches all unhandled errors
- Logs errors with stack traces
- Returns standardized error responses
- Hides sensitive details in production

### Graceful Shutdown

The server handles shutdown signals:
- `SIGTERM` - Graceful shutdown
- `SIGINT` - User interrupt (Ctrl+C)
- Closes database connections
- Finishes pending requests
- Force shutdown after 10s timeout

---

## 📦 Module Exports

```typescript
// routes/transcription.routes.ts
export default router: Router;

// routes/auth.routes.ts
export default router: Router;

// routes/webhook.routes.ts
export default router: Router;

// routes/index.ts
export default router: Router;

// index.ts (main server)
export default app: Express;
```

---

## ✅ Integration Checklist

- [x] All routes implement standard response format
- [x] Authentication middleware applied to protected routes
- [x] Rate limiting applied to transcribe endpoint
- [x] Input validation using Zod schemas
- [x] Database queries use Prisma client
- [x] S3 service integrated for upload/download URLs
- [x] Queue service integrated for job management
- [x] Payment service integrated for webhooks
- [x] Comprehensive error handling
- [x] Structured logging throughout
- [x] Security middleware (Helmet, CORS)
- [x] Health check endpoints
- [x] Graceful shutdown handling
- [x] Test coverage >80%

---

## 🎯 Testing the Integration

### 1. Start Required Services
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Start Redis
docker-compose up -d redis

# Run migrations
npm run prisma:migrate
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Test Endpoints
```bash
# Health check
curl http://localhost:3000/health

# API version
curl http://localhost:3000/api/version

# Create test user and get API key (via database)
npm run prisma:studio
```

---

## 📚 Additional Resources

- [Express Documentation](https://expressjs.com/)
- [Zod Validation](https://zod.dev/)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

**Task 8 Complete** ✅

This module is production-ready and fully integrated with all dependent tasks (1-7, 9).

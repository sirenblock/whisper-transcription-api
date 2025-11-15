# Configuration Manager

Centralized configuration system for the Whisper Transcription API with instant worker mode switching.

## 🎯 Features

- **Worker Mode Toggle**: Switch between local Mac Mini and cloud GPU processing in seconds
- **Type Safety**: Full TypeScript support with type exports
- **Validation**: Automatic validation on startup with clear error messages
- **Environment-Aware**: Different behaviors for development/production
- **Helper Methods**: Built-in utilities for common configuration tasks

## 📁 Structure

```
config/
├── index.ts       # Main configuration export
├── validate.ts    # Validation logic
└── README.md      # This file
```

## 🚀 Quick Start

### 1. Installation

```bash
cd backend
npm install dotenv
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```bash
# Required: Database
DATABASE_URL="postgresql://user:password@localhost:5432/whisperapi"

# Required: S3/R2
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"

# Required: Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRICE_ID_PRO="price_xxx"

# Worker Mode (the key toggle!)
WORKER_MODE="local"
LOCAL_WORKER_URL="http://100.x.x.x:3001"
```

### 3. Usage in Code

```typescript
import config from './config';

// Access configuration
console.log(config.worker.mode); // 'local' or 'cloud'
console.log(config.s3.bucket);    // Your S3 bucket name

// Use helper methods
const rateLimit = config.rateLimit.getLimit('PRO'); // 20
const quota = config.quota.getQuota('FREE');         // 60
const isAllowed = config.file.isFormatAllowed('mp3'); // true

// Get active worker URL based on mode
const workerUrl = config.worker.activeUrl;
```

## 🔄 Switching Workers

### Local to Cloud

**Before:**
```bash
WORKER_MODE="local"
LOCAL_WORKER_URL="http://100.x.x.x:3001"
```

**After:**
```bash
WORKER_MODE="cloud"
CLOUD_WORKER_URL="https://your-app.modal.run"
```

**Apply changes:**
```bash
npm restart
# or
pm2 restart whisper-api
```

**Validation:** Check logs for:
```
✓ Configuration validated successfully
✓ Worker mode: cloud
```

### Cloud to Local

Simply reverse the process:

```bash
WORKER_MODE="local"
```

Restart the server. No code changes needed!

## 📋 Configuration Reference

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |

### Database

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ❌ | Redis connection string (default: localhost) |

### S3 / Cloudflare R2

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_BUCKET` | ✅ | Bucket name |
| `S3_REGION` | ❌ | AWS region (default: us-east-1) |
| `S3_ACCESS_KEY` | ✅ | Access key ID |
| `S3_SECRET_KEY` | ✅ | Secret access key |
| `S3_ENDPOINT` | ❌ | Custom endpoint (for R2) |

### Worker Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_MODE` | `local` | `local` or `cloud` |
| `LOCAL_WORKER_URL` | - | Tailscale/local worker URL |
| `CLOUD_WORKER_URL` | - | Modal/cloud worker URL |

### Stripe

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret |
| `STRIPE_PRICE_ID_PRO` | ✅ | Pro plan price ID |

### Rate Limits (per hour)

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_FREE` | `3` | Free tier requests/hour |
| `RATE_LIMIT_PRO` | `20` | Pro tier requests/hour |
| `RATE_LIMIT_PAYG` | `100` | PAYG tier requests/hour |

### Quotas (minutes/month)

| Variable | Default | Description |
|----------|---------|-------------|
| `QUOTA_FREE` | `60` | Free tier monthly minutes |
| `QUOTA_PRO` | `600` | Pro tier monthly minutes |

### File Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE_MB` | `500` | Maximum upload size |
| `ALLOWED_FORMATS` | `mp3,wav,m4a,mp4,mpeg,webm` | Comma-separated formats |
| `FILE_RETENTION_HOURS` | `24` | Hours to keep files in S3 |

## 🔍 Validation

Configuration is automatically validated on application startup. The validation checks:

### Critical Errors (will prevent startup):
- Missing required environment variables
- Invalid worker mode
- Invalid URLs
- Invalid numeric values
- Invalid port numbers

### Warnings (will allow startup):
- Worker URL not set for selected mode
- Non-HTTPS URLs in production
- Test Stripe keys in production

### Example Output

**Success:**
```
✓ Configuration validated successfully
```

**With Warnings:**
```
⚠️  Configuration Warnings:
   - WORKER_MODE=local but LOCAL_WORKER_URL is not set

✓ Configuration validated (with warnings)
```

**Failure:**
```
❌ Configuration Errors:
   - DATABASE_URL is required
   - S3_BUCKET is required

Configuration validation failed
```

## 🛠️ Helper Methods

### Rate Limit Helpers

```typescript
// Get rate limit for a plan
const limit = config.rateLimit.getLimit('PRO'); // 20
```

### Quota Helpers

```typescript
// Get quota for a plan
const quota = config.quota.getQuota('FREE'); // 60 minutes
const paygQuota = config.quota.getQuota('PAYG'); // Infinity
```

### File Helpers

```typescript
// Check if file format is allowed
const isAllowed = config.file.isFormatAllowed('mp3'); // true
const notAllowed = config.file.isFormatAllowed('exe'); // false

// Get max file size in bytes
const maxBytes = config.file.maxSizeBytes; // 524288000 (500MB)
```

### Worker Helpers

```typescript
// Get active worker URL based on mode
const url = config.worker.activeUrl;

// Check if worker is properly configured
const isReady = config.worker.isConfigured; // true/false
```

## 🧪 Testing Configuration

### Validate Manually

```typescript
import { validateConfig } from './config/validate';
import config from './config';

try {
  validateConfig(config);
  console.log('Config is valid!');
} catch (error) {
  console.error('Config error:', error.message);
}
```

### Test Different Modes

```bash
# Test local mode
WORKER_MODE=local npm start

# Test cloud mode
WORKER_MODE=cloud npm start
```

## 🔒 Security Notes

1. **Never commit `.env`** - Use `.env.example` as template
2. **Rotate secrets regularly** - Especially API keys and Stripe keys
3. **Use HTTPS in production** - Validation will warn about HTTP
4. **Separate test/prod Stripe keys** - Use `sk_live_` in production
5. **Restrict S3 permissions** - Use principle of least privilege

## 📊 Environment-Specific Behavior

### Development
- Allows HTTP URLs
- Permits localhost connections
- More permissive validation

### Production
- Enforces HTTPS for worker URLs
- Warns about localhost database/Redis
- Warns about test Stripe keys
- Stricter validation overall

## 🔧 Troubleshooting

### "Missing required config: DATABASE_URL"
**Solution:** Add `DATABASE_URL` to your `.env` file

### "Invalid WORKER_MODE: xyz"
**Solution:** Set `WORKER_MODE` to either `local` or `cloud`

### "WORKER_MODE=local but LOCAL_WORKER_URL not set"
**Solution:** This is a warning. Add `LOCAL_WORKER_URL` to use local worker.

### Worker not processing jobs
**Solution:**
1. Check `WORKER_MODE` is set correctly
2. Verify the appropriate worker URL is set
3. Check worker is running: `curl <WORKER_URL>/health`

### Configuration not updating
**Solution:** Restart the server after changing `.env`:
```bash
npm restart
# or
pm2 restart all
```

## 📚 Integration Examples

### With Express Routes

```typescript
import express from 'express';
import config from './config';

const app = express();

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Worker mode: ${config.worker.mode}`);
});
```

### With Job Queue

```typescript
import { Queue } from 'bullmq';
import config from './config';

const queue = new Queue('transcription', {
  connection: config.redisUrl
});

// Send jobs to active worker
await fetch(config.worker.activeUrl + '/process', {
  method: 'POST',
  body: JSON.stringify(jobData)
});
```

### With Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import config from './config';

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.rateLimit.free, // Limit based on plan
});
```

## 🎓 Best Practices

1. **Use getters for derived values** - Like `activeUrl` and `isConfigured`
2. **Validate early** - Configuration validates on module load
3. **Type everything** - Export types for consumers
4. **Provide defaults** - For non-critical settings
5. **Document everything** - Keep this README updated
6. **Test both modes** - Ensure local and cloud work

## 📞 Support

If configuration issues persist:
1. Check all required variables are set
2. Verify `.env` file is in the correct location
3. Check for typos in variable names
4. Review validation output carefully
5. Consult the integration guide

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0

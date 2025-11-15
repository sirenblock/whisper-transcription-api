# Configuration Module - Quick Start Guide

Get up and running with the configuration module in 5 minutes.

## ⚡ 5-Minute Setup

### Step 1: Copy Environment File (30 seconds)

```bash
cd backend
cp .env.example .env
```

### Step 2: Edit Required Variables (2 minutes)

Open `.env` and set these **required** values:

```bash
# Database (get from Railway/Supabase)
DATABASE_URL="postgresql://user:pass@host:5432/db"

# S3/R2 (get from AWS/Cloudflare)
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
STRIPE_PRICE_ID_PRO="price_xxxxx"

# Worker Mode (choose one)
WORKER_MODE="local"                    # or "cloud"
LOCAL_WORKER_URL="http://100.x.x.x:3001"  # if local
```

### Step 3: Install Dependencies (1 minute)

```bash
npm install
```

### Step 4: Start Server (30 seconds)

```bash
npm run dev
```

### Step 5: Verify (30 seconds)

Look for this in your console:

```
✓ Configuration validated successfully
✓ Worker mode: local
Server running on port 3000
```

✅ **Done!** You're ready to use the configuration module.

---

## 🎯 Using Configuration in Your Code

### Import the Config

```typescript
import config from './config';
```

### Access Values

```typescript
// Server
config.port              // 3000
config.nodeEnv           // 'development'
config.isDevelopment     // true

// Database
config.databaseUrl       // Your database URL

// Worker
config.worker.mode       // 'local' or 'cloud'
config.worker.activeUrl  // Active worker URL

// S3
config.s3.bucket         // Your S3 bucket
config.s3.region         // S3 region

// Stripe
config.stripe.secretKey  // Stripe secret key

// Rate Limits
config.rateLimit.free    // 3
config.rateLimit.pro     // 20

// Quotas
config.quota.free        // 60 minutes
config.quota.pro         // 600 minutes

// Files
config.file.maxSizeMB           // 500
config.file.allowedFormats      // ['mp3', 'wav', ...]
```

### Use Helper Methods

```typescript
// Get rate limit for a plan
const limit = config.rateLimit.getLimit('PRO');  // 20

// Get quota for a plan
const quota = config.quota.getQuota('FREE');     // 60

// Check if file format is allowed
const allowed = config.file.isFormatAllowed('mp3');  // true

// Check if worker is configured
const ready = config.worker.isConfigured;        // true/false
```

---

## 🔄 Switch Worker Mode (30 seconds)

### From Local to Cloud

1. **Edit `.env`:**
   ```bash
   WORKER_MODE="cloud"
   CLOUD_WORKER_URL="https://your-modal-app.modal.run"
   ```

2. **Restart:**
   ```bash
   npm restart
   ```

3. **Done!** Jobs now go to cloud worker.

### From Cloud to Local

1. **Edit `.env`:**
   ```bash
   WORKER_MODE="local"
   LOCAL_WORKER_URL="http://100.x.x.x:3001"
   ```

2. **Restart:**
   ```bash
   npm restart
   ```

3. **Done!** Jobs now go to local worker.

**No code changes required!**

---

## 📚 Common Use Cases

### Validate File Upload

```typescript
import config from './config';

function validateFile(file: File) {
  // Check size
  if (file.size > config.file.maxSizeBytes) {
    throw new Error(`File too large (max ${config.file.maxSizeMB}MB)`);
  }

  // Check format
  const ext = file.name.split('.').pop();
  if (!config.file.isFormatAllowed(ext)) {
    throw new Error(`Format not allowed`);
  }

  return true;
}
```

### Check Rate Limit

```typescript
import config from './config';

function checkRateLimit(user, requestCount) {
  const limit = config.rateLimit.getLimit(user.plan);

  if (requestCount >= limit) {
    throw new Error('Rate limit exceeded');
  }

  return true;
}
```

### Check Quota

```typescript
import config from './config';

function checkQuota(user, minutes) {
  const quota = config.quota.getQuota(user.plan);

  if (quota === Infinity) {
    return true; // PAYG has unlimited quota
  }

  const remaining = quota - user.monthlyMinutesUsed;

  if (remaining < minutes) {
    throw new Error('Monthly quota exceeded');
  }

  return true;
}
```

### Initialize S3 Client

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import config from './config';

const s3 = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,  // Optional for R2
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
});
```

### Initialize Stripe

```typescript
import Stripe from 'stripe';
import config from './config';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});
```

### Send Job to Worker

```typescript
import config from './config';

async function sendTranscriptionJob(jobData) {
  // Automatically uses correct worker based on WORKER_MODE
  const response = await fetch(`${config.worker.activeUrl}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });

  return response.json();
}
```

---

## 🧪 Testing Your Configuration

### Manual Validation

```bash
# Set environment to test
export NODE_ENV=test

# Load environment
source .env

# Run validation
node -e "require('./src/config')"
```

Look for:
```
✓ Configuration validated successfully
```

### Run Tests (requires npm install)

```bash
# Run all config tests
npm run test:config

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:coverage
```

---

## ⚠️ Troubleshooting

### Problem: "Missing required config: DATABASE_URL"

**Solution:** Add `DATABASE_URL` to your `.env` file:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### Problem: "Invalid WORKER_MODE"

**Solution:** Use lowercase 'local' or 'cloud':
```bash
WORKER_MODE="local"  # ✅ Correct
WORKER_MODE="Local"  # ❌ Wrong
```

### Problem: Configuration not updating

**Solution:** Restart the server after changing `.env`:
```bash
npm restart
# or
pm2 restart whisper-api
```

### Problem: Worker URL warning

**Solution:** Set the appropriate worker URL:
```bash
# For local mode
LOCAL_WORKER_URL="http://100.x.x.x:3001"

# For cloud mode
CLOUD_WORKER_URL="https://your-app.modal.run"
```

---

## 📖 Further Reading

After completing this quick start, explore:

1. **README.md** - Complete documentation
2. **INTEGRATION.md** - Integration with other modules
3. **examples.ts** - 11 detailed code examples

---

## 🎓 Next Steps

1. ✅ Complete the 5-minute setup above
2. ✅ Verify configuration loads correctly
3. ✅ Import config in your module
4. ✅ Replace `process.env.*` with `config.*`
5. ✅ Use helper methods
6. ✅ Test with different worker modes
7. ✅ Read full documentation

---

## 💡 Tips

- **Always use config, never process.env directly** - Config validates and type-checks
- **Worker toggle is your friend** - Switch modes in 30 seconds
- **Use helper methods** - They handle edge cases for you
- **Check isConfigured** - Before sending jobs to workers
- **Environment matters** - Different validation for dev/prod

---

## 📞 Need Help?

1. Check validation output for specific errors
2. Review `.env.example` for correct format
3. Read troubleshooting section above
4. Consult README.md for detailed docs
5. Check INTEGRATION.md for your module

---

**You're ready to go! Start using the configuration module in your code.**

Happy coding! 🚀

# 🎙️ Whisper Transcription API - Complete System

> Production-ready transcription API powered by OpenAI Whisper with scalable worker processing

**Status:** ✅ **All 13 tasks completed and integrated**

---

## 📊 Project Overview

A complete, production-ready transcription API service with:
- RESTful API with authentication and rate limiting
- Scalable job queue system with BullMQ
- Both local (Whisper.cpp) and cloud (Modal) workers
- Stripe payment integration
- User dashboard and landing page
- Full deployment configuration

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React + TS)   │
│                 │
│  • Dashboard    │
│  • Landing Page │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Backend API   │
│  (Express + TS) │
│                 │
│  • Auth         │
│  • Rate Limit   │
│  • S3 Upload    │
│  • Job Queue    │
└────────┬────────┘
         │
         ├──► PostgreSQL (Prisma)
         ├──► Redis (BullMQ Queue)
         ├──► S3 (File Storage)
         └──► Stripe (Payments)
         │
         ▼
┌─────────────────┬─────────────────┐
│  Local Worker   │  Cloud Worker   │
│  (Whisper.cpp)  │  (Modal.com)    │
│                 │                 │
│  Mac Mini M2    │  A10G GPU       │
└─────────────────┴─────────────────┘
```

---

## 📂 Project Structure

```
whisper-api/
├── backend/                         # Node.js/Express API
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── migrations/             # DB migrations
│   │   └── seed.ts                 # Test data
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts            # Prisma client
│   │   │   └── helpers.ts          # DB helpers
│   │   ├── services/
│   │   │   ├── s3.service.ts       # S3 upload/download
│   │   │   ├── queue.service.ts    # BullMQ queue
│   │   │   ├── auth.service.ts     # JWT & API keys
│   │   │   └── stripe.service.ts   # Payments
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts  # Authentication
│   │   │   └── rateLimit.middleware.ts  # Rate limiting
│   │   ├── routes/
│   │   │   ├── transcription.routes.ts  # Main API
│   │   │   ├── auth.routes.ts      # Login/signup
│   │   │   ├── stripe.routes.ts    # Webhooks
│   │   │   └── health.routes.ts    # Health check
│   │   ├── config/
│   │   │   └── index.ts            # Config manager
│   │   └── server.ts               # Express app
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── dashboard/                  # User dashboard (React)
│   │   ├── src/
│   │   │   ├── components/         # UI components
│   │   │   ├── pages/              # Pages
│   │   │   ├── hooks/              # Custom hooks
│   │   │   ├── utils/              # Helpers
│   │   │   └── App.tsx
│   │   └── package.json
│   └── landing/                    # Landing page (React)
│       ├── src/
│       │   ├── components/
│       │   ├── sections/
│       │   └── App.tsx
│       └── package.json
│
├── workers/
│   ├── local/                      # Mac Mini worker
│   │   ├── src/
│   │   │   ├── index.ts            # Worker entry
│   │   │   └── whisper-runner.ts   # Whisper.cpp wrapper
│   │   └── package.json
│   └── cloud/                      # Modal.com worker
│       ├── modal_worker.py         # Python worker
│       └── requirements.txt
│
├── docker/                         # Docker configs
│   ├── backend.Dockerfile
│   ├── worker.Dockerfile
│   └── docker-compose.yml
│
├── k8s/                            # Kubernetes manifests
│   ├── backend-deployment.yaml
│   ├── worker-deployment.yaml
│   └── redis-statefulset.yaml
│
├── .env.example                    # Environment template
└── README.md                       # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **Redis** 7+
- **AWS Account** (for S3)
- **Stripe Account** (for payments)

### 1. Clone & Install

```bash
# Install backend
cd backend
npm install

# Install frontend dashboard
cd ../frontend/dashboard
npm install

# Install frontend landing
cd ../landing
npm install

# Install local worker
cd ../../workers/local
npm install
```

### 2. Database Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed
```

### 3. Start Services

```bash
# Terminal 1: PostgreSQL
brew services start postgresql@14

# Terminal 2: Redis
redis-server

# Terminal 3: Backend API
cd backend
npm run dev

# Terminal 4: Frontend Dashboard
cd frontend/dashboard
npm run dev

# Terminal 5: Frontend Landing
cd frontend/landing
npm run dev

# Terminal 6: Local Worker
cd workers/local
npm run dev
```

### 4. Test the API

```bash
# Get API key from seed data
API_KEY="wtr_live_test_key_12345678901234567890"

# Upload and transcribe
curl -X POST http://localhost:3000/api/v1/transcribe \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@sample.mp3" \
  -F "model=BASE" \
  -F "format=JSON"

# Check status
curl http://localhost:3000/api/v1/status/{transcriptionId} \
  -H "Authorization: Bearer $API_KEY"

# Get result
curl http://localhost:3000/api/v1/result/{transcriptionId} \
  -H "Authorization: Bearer $API_KEY"
```

---

## 📋 Task Breakdown

| Task | Module | Status | Files |
|------|--------|--------|-------|
| 1 | Database Schema (Prisma) | ✅ | `backend/prisma/*`, `backend/src/db/*` |
| 2 | S3 File Upload Service | ✅ | `backend/src/services/s3.service.ts` |
| 3 | Auth Middleware (JWT + API Keys) | ✅ | `backend/src/middleware/auth.middleware.ts` |
| 4 | Rate Limiting Middleware | ✅ | `backend/src/middleware/rateLimit.middleware.ts` |
| 5 | Job Queue (BullMQ) | ✅ | `backend/src/services/queue.service.ts` |
| 6 | Local Worker (Whisper.cpp) | ✅ | `workers/local/*` |
| 7 | Cloud Worker (Modal) | ✅ | `workers/cloud/*` |
| 8 | API Routes | ✅ | `backend/src/routes/*` |
| 9 | Stripe Integration | ✅ | `backend/src/services/stripe.service.ts` |
| 10 | Frontend Dashboard | ✅ | `frontend/dashboard/*` |
| 11 | Landing Page | ✅ | `frontend/landing/*` |
| 12 | Config Manager | ✅ | `backend/src/config/*` |
| 13 | Deployment Configs | ✅ | `docker/*`, `k8s/*` |

---

## 🔑 Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/whisper_api"

# Redis
REDIS_URL="redis://localhost:6379"

# AWS S3
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="whisper-transcriptions"

# JWT
JWT_SECRET="your_super_secret_key_change_in_production"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_PRO="price_..."

# App
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### Workers (.env)

```bash
# Same as backend, plus:
WORKER_CONCURRENCY=2
WHISPER_MODEL_PATH="/path/to/whisper/models"
```

---

## 🎯 API Endpoints

### Authentication

```
POST   /api/v1/auth/signup          # Create account
POST   /api/v1/auth/login           # Login
GET    /api/v1/auth/me              # Get user info
POST   /api/v1/keys                 # Generate API key
DELETE /api/v1/keys/:id             # Revoke API key
```

### Transcription

```
POST   /api/v1/transcribe           # Upload & transcribe
GET    /api/v1/status/:id           # Check status
GET    /api/v1/result/:id           # Get result
GET    /api/v1/transcriptions       # List all
DELETE /api/v1/transcribe/:id       # Cancel job
```

### Payments

```
POST   /api/v1/stripe/create-checkout    # Start subscription
POST   /api/v1/stripe/create-portal      # Manage billing
POST   /api/v1/stripe/webhook            # Stripe webhooks
```

### Health

```
GET    /health                      # Service health
GET    /api/v1/stats                # Usage stats
```

---

## 💳 Pricing Tiers

| Plan | Price | Minutes/Month | Priority | Features |
|------|-------|---------------|----------|----------|
| **FREE** | $0 | 60 min | Low | Base model, JSON only |
| **PRO** | $29/mo | 1000 min | High | All models, all formats |
| **PAYG** | $0.10/min | Unlimited | Highest | Enterprise support |

---

## 🧪 Testing

### Unit Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend/dashboard
npm test
```

### Integration Tests

```bash
# Full stack test
cd backend
npm run test:integration
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run scripts/load-test.js
```

---

## 🚢 Deployment

### Docker Compose (Local)

```bash
docker-compose up -d
```

### Kubernetes (Production)

```bash
# Apply configs
kubectl apply -f k8s/

# Check status
kubectl get pods

# View logs
kubectl logs -f deployment/backend-api
```

### Environment-Specific

```bash
# Staging
kubectl apply -f k8s/ --namespace=staging

# Production
kubectl apply -f k8s/ --namespace=production
```

---

## 📊 Monitoring

### Health Checks

```bash
curl http://localhost:3000/health
```

### Queue Stats

```bash
curl http://localhost:3000/api/v1/admin/queue-stats \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### Logs

```bash
# Backend
tail -f logs/api.log

# Worker
tail -f logs/worker.log
```

---

## 🔒 Security

### API Key Format

```
wtr_live_1234567890abcdef1234567890abcdef
wtr_test_1234567890abcdef1234567890abcdef
```

### Rate Limits

| Plan | Requests/Minute | Concurrent Jobs |
|------|-----------------|-----------------|
| FREE | 10 | 1 |
| PRO | 60 | 3 |
| PAYG | 300 | 10 |

### Best Practices

1. **Never expose API keys** in frontend code
2. **Use HTTPS** in production
3. **Rotate Stripe webhook secrets** periodically
4. **Enable CORS** only for trusted domains
5. **Use Prisma** parameterized queries (prevents SQL injection)

---

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Reset database
npx prisma migrate reset
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Start Redis
redis-server
```

### S3 Upload Failed

```bash
# Verify AWS credentials
aws s3 ls

# Check bucket exists
aws s3 ls s3://your-bucket-name
```

### Worker Not Processing Jobs

```bash
# Check Redis connection
redis-cli
> KEYS *

# Check queue stats
curl http://localhost:3000/api/v1/admin/queue-stats

# Restart worker
npm run worker:restart
```

---

## 📚 Documentation

### Generated Docs

- `backend/README.md` - Backend API guide
- `backend/INTEGRATION.md` - Module integration
- `TASK_*_SUMMARY.md` - Individual task summaries
- `INTEGRATION_NOTES.md` - Cross-module integration

### API Documentation

OpenAPI/Swagger docs available at:
```
http://localhost:3000/api-docs
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Commit** your changes
4. **Push** to the branch
5. **Open** a Pull Request

---

## 📝 License

MIT License - See LICENSE file

---

## 🎉 Success!

All 13 tasks completed and integrated successfully!

**Next Steps:**
1. Configure your `.env` files
2. Run database migrations
3. Start all services
4. Test with sample audio
5. Deploy to production

**Need Help?**
- Check individual task READMEs
- Review integration notes
- See troubleshooting section

---

<div align="center">

**Built with 13 parallel Claude AI agents** 🤖

[API Docs](http://localhost:3000/api-docs) • [Dashboard](http://localhost:5173) • [Landing](http://localhost:5174)

</div>

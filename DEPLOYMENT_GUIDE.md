# 🚀 Whisper API - Complete Deployment Guide

## Step-by-Step: Local to Production

---

## PHASE 1: Local Setup (5 minutes)

### Step 1: Initialize Git Repository

```bash
cd /Users/lsd/msclaude/projects/1-1
git init
```

### Step 2: Create .gitignore for Main Project

```bash
cat > .gitignore.whisper <<'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary
tmp/
temp/
*.tmp

# Testing
coverage/

# Orchestrator files (from parallel Claude setup)
.claude-orchestrator/
keep-alive-auto.sh
prompts-ready-to-paste/
test-*.sh
auto-claude-*.sh
TASK_*.md
00_SHARED_CONTEXT.md
ASSEMBLY_GUIDE.md
FILE_INVENTORY.md
SIMPLE_WORKFLOW.md
WORKFLOW.txt
*SUMMARY*.md
*INTEGRATION*.md
QUICK_START.md
README_START_HERE.md
SETUP_GUIDE.md

# Keep project files
!MASTER_PROJECT_README.md
!PROJECT_STATUS_FINAL.md
!DEPLOYMENT_GUIDE.md
!quick-start.sh
!.env.master.example
EOF
```

### Step 3: Add All Project Files

```bash
git add backend/ frontend/ workers/ docker/ k8s/
git add MASTER_PROJECT_README.md PROJECT_STATUS_FINAL.md DEPLOYMENT_GUIDE.md
git add quick-start.sh .env.master.example
git add .gitignore.whisper
```

### Step 4: Create Initial Commit

```bash
git commit -m "Initial commit: Whisper Transcription API

Complete production-ready transcription API with:
- Backend API (Express + TypeScript)
- Frontend Dashboard (React)
- Frontend Landing Page (React)
- Local Worker (Whisper.cpp)
- Cloud Worker (Modal.com)
- Full deployment configs (Docker + K8s)

Built with 13 parallel Claude AI agents

Features:
- User authentication (JWT + API keys)
- S3 file storage
- BullMQ job queue
- Stripe payment integration
- Rate limiting by plan
- Scalable worker processing
- Production-ready deployment

🚀 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 2: GitHub Setup (2 minutes)

### Step 5: Create GitHub Repository

```bash
gh repo create whisper-transcription-api --public \
  --description "Production-ready transcription API powered by OpenAI Whisper with scalable worker processing" \
  --source=. \
  --push
```

Or manually:
1. Go to https://github.com/new
2. Name: `whisper-transcription-api`
3. Description: "Production-ready transcription API powered by OpenAI Whisper"
4. Public repository
5. Don't initialize with README (we have one)
6. Create repository

Then push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/whisper-transcription-api.git
git branch -M main
git push -u origin main
```

---

## PHASE 3: Local Testing (10 minutes)

### Step 6: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend Dashboard
cd ../frontend/dashboard
npm install

# Frontend Landing
cd ../landing
npm install

# Local Worker
cd ../../workers/local
npm install

cd ../..
```

### Step 7: Set Up Environment

```bash
# Copy environment template
cp .env.master.example backend/.env

# Edit with your credentials
nano backend/.env
```

**Required credentials:**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret
- `S3_BUCKET_NAME` - S3 bucket name
- `JWT_SECRET` - Random secret (generate with `openssl rand -hex 32`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Step 8: Set Up Database

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Seed test data
npx prisma db seed
```

### Step 9: Start Services Locally

Open 6 terminals:

**Terminal 1 - PostgreSQL:**
```bash
# If using Homebrew
brew services start postgresql@14

# Or using Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password --name whisper-postgres postgres:14
```

**Terminal 2 - Redis:**
```bash
# If using Homebrew
redis-server

# Or using Docker
docker run -d -p 6379:6379 --name whisper-redis redis:7
```

**Terminal 3 - Backend API:**
```bash
cd backend
npm run dev
```

**Terminal 4 - Frontend Dashboard:**
```bash
cd frontend/dashboard
npm run dev
```

**Terminal 5 - Frontend Landing:**
```bash
cd frontend/landing
npm run dev
```

**Terminal 6 - Local Worker:**
```bash
cd workers/local
npm run dev
```

### Step 10: Test Locally

```bash
# Use test API key from seed data
API_KEY="wtr_live_test_key_12345678901234567890"

# Test health endpoint
curl http://localhost:3000/health

# Upload test file
curl -X POST http://localhost:3000/api/v1/transcribe \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@test-audio.mp3" \
  -F "model=BASE" \
  -F "format=JSON"
```

---

## PHASE 4: Production Deployment (30 minutes)

### Option A: Docker Compose (Recommended for small-scale)

### Step 11: Configure Production Environment

```bash
cp .env.master.example .env.production

# Edit production values
nano .env.production
```

### Step 12: Build Docker Images

```bash
# Build all images
docker-compose -f docker/docker-compose.prod.yml build

# Or build individually
docker build -f docker/backend.Dockerfile -t whisper-api-backend:latest ./backend
docker build -f docker/worker.Dockerfile -t whisper-api-worker:latest ./workers/local
```

### Step 13: Deploy with Docker Compose

```bash
# Start all services
docker-compose -f docker/docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker/docker-compose.prod.yml ps
```

### Step 14: Set Up Domain & SSL

```bash
# Install Caddy or Nginx for reverse proxy
sudo apt install caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

Add:
```
your-domain.com {
    reverse_proxy localhost:3000
}

dashboard.your-domain.com {
    reverse_proxy localhost:5173
}
```

```bash
# Restart Caddy
sudo systemctl reload caddy
```

---

### Option B: Kubernetes (Recommended for scale)

### Step 15: Set Up Kubernetes Cluster

**Using DigitalOcean:**
```bash
# Install doctl
brew install doctl

# Authenticate
doctl auth init

# Create cluster
doctl kubernetes cluster create whisper-api-cluster \
  --region nyc1 \
  --size s-2vcpu-4gb \
  --count 3
```

**Using AWS EKS:**
```bash
# Install eksctl
brew install eksctl

# Create cluster
eksctl create cluster \
  --name whisper-api \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3
```

### Step 16: Create Kubernetes Secrets

```bash
# Database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=password=YOUR_POSTGRES_PASSWORD

# Redis credentials
kubectl create secret generic redis-credentials \
  --from-literal=password=YOUR_REDIS_PASSWORD

# AWS credentials
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=YOUR_AWS_KEY \
  --from-literal=secret-access-key=YOUR_AWS_SECRET

# Stripe credentials
kubectl create secret generic stripe-credentials \
  --from-literal=secret-key=YOUR_STRIPE_KEY \
  --from-literal=webhook-secret=YOUR_WEBHOOK_SECRET

# JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=secret=$(openssl rand -hex 32)
```

### Step 17: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployments
kubectl get deployments
kubectl get pods
kubectl get services

# Check logs
kubectl logs -f deployment/backend-api
```

### Step 18: Set Up Ingress & SSL

```bash
# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Get external IP
kubectl get ingress
```

### Step 19: Configure DNS

Point your domain to the ingress external IP:
```
A    api.your-domain.com    -> EXTERNAL_IP
A    dashboard.your-domain.com -> EXTERNAL_IP
A    www.your-domain.com    -> EXTERNAL_IP
```

---

## PHASE 5: Monitoring & Maintenance

### Step 20: Set Up Monitoring

**Using Datadog:**
```bash
# Install Datadog agent
helm repo add datadog https://helm.datadoghq.com
helm install datadog-agent datadog/datadog \
  --set datadog.apiKey=YOUR_API_KEY
```

**Using Prometheus + Grafana:**
```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```

### Step 21: Set Up Logging

```bash
# Install Loki for logs
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack
```

### Step 22: Configure Backups

**Database backups:**
```bash
# Create backup cronjob
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14
            command:
            - /bin/sh
            - -c
            - pg_dump -h postgres -U whisper_user whisper_api > /backup/backup-$(date +%Y%m%d).sql
          restartPolicy: OnFailure
EOF
```

---

## PHASE 6: Stripe Configuration

### Step 23: Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://api.your-domain.com/api/v1/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook signing secret to `.env`

### Step 24: Test Stripe Integration

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook

# Test checkout
stripe trigger customer.subscription.created
```

---

## PHASE 7: Production Checklist

### Step 25: Security Checklist

- [ ] Change all default passwords
- [ ] Rotate JWT secret
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Review IAM permissions
- [ ] Enable database encryption
- [ ] Set up VPN for database access
- [ ] Enable audit logging

### Step 26: Performance Optimization

- [ ] Enable Redis persistence
- [ ] Configure database connection pooling
- [ ] Set up CDN for frontend
- [ ] Enable Gzip compression
- [ ] Optimize Docker images
- [ ] Configure auto-scaling
- [ ] Set up read replicas
- [ ] Enable query caching

### Step 27: Monitoring Setup

- [ ] Set up uptime monitoring
- [ ] Configure error alerting
- [ ] Set up performance dashboards
- [ ] Enable log aggregation
- [ ] Configure cost alerts
- [ ] Set up user analytics
- [ ] Monitor API usage
- [ ] Track queue metrics

---

## Quick Commands Reference

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose build --no-cache
```

### Kubernetes Commands
```bash
# Get all resources
kubectl get all

# Describe pod
kubectl describe pod POD_NAME

# View logs
kubectl logs -f POD_NAME

# Execute command in pod
kubectl exec -it POD_NAME -- /bin/bash

# Scale deployment
kubectl scale deployment/backend-api --replicas=5

# Update deployment
kubectl set image deployment/backend-api backend=whisper-api:v2
```

### Database Commands
```bash
# Connect to database
kubectl exec -it POD_NAME -- psql -U whisper_user -d whisper_api

# Run migration
kubectl exec -it POD_NAME -- npx prisma migrate deploy

# Backup database
pg_dump -h HOST -U USER -d DATABASE > backup.sql
```

---

## Troubleshooting

### Issue: Can't connect to database
```bash
# Check database pod
kubectl get pods | grep postgres

# Check database logs
kubectl logs postgres-POD_NAME

# Test connection
kubectl exec -it backend-POD -- nc -zv postgres 5432
```

### Issue: Worker not processing jobs
```bash
# Check Redis connection
kubectl exec -it worker-POD -- redis-cli -h redis ping

# Check queue
kubectl exec -it backend-POD -- npm run queue:stats
```

### Issue: High latency
```bash
# Check pod resources
kubectl top pods

# Check horizontal pod autoscaling
kubectl get hpa

# Scale manually
kubectl scale deployment/backend-api --replicas=10
```

---

## Success Criteria

✅ All health checks passing
✅ API responding < 200ms
✅ Workers processing jobs
✅ Frontend accessible
✅ SSL certificates valid
✅ Monitoring active
✅ Backups running
✅ Stripe webhooks working

---

## Next Steps After Deployment

1. **Marketing:** Launch landing page
2. **Analytics:** Set up Google Analytics
3. **Support:** Configure support email
4. **Documentation:** Publish API docs
5. **Community:** Create Discord/Slack
6. **Blog:** Announce launch
7. **SEO:** Optimize for search
8. **Partnerships:** Reach out to integrators

---

**Deployment Time Estimates:**
- Local testing: 10 minutes
- Docker Compose: 30 minutes
- Kubernetes: 1-2 hours
- Full production: 4-6 hours (including monitoring, backups, etc.)

**Congratulations! Your Whisper API is now live!** 🎉

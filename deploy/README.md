# WhisperAPI Deployment Module

Production-ready deployment configurations for Railway, Vercel, Docker, and worker setup.

## 📁 Directory Structure

```
deploy/
├── railway.json                          # Railway platform config
├── vercel-dashboard.json                 # Vercel config for dashboard
├── vercel-landing.json                   # Vercel config for landing page
├── Dockerfile                            # Production Docker image
├── docker-compose.yml                    # Development stack
├── docker-compose.prod.yml               # Production stack
├── init-db.sql                           # Database initialization
├── tailscale-setup.sh                    # Tailscale VPN setup
├── cloudflare-tunnel-setup.sh            # Cloudflare tunnel setup
├── package.json                          # Deployment scripts and tests
├── scripts/
│   ├── health-check.sh                   # Health check validator
│   ├── deploy-railway.sh                 # Railway deployment automation
│   ├── deploy-vercel.sh                  # Vercel deployment automation
│   ├── backup-db.sh                      # Database backup script
│   └── validate-env.sh                   # Environment validation
└── __tests__/
    └── deployment.test.js                # Deployment configuration tests
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Validate Configuration

```bash
# Validate environment variables
npm run validate -- ../backend/.env

# Or directly
bash scripts/validate-env.sh ../backend/.env
```

### 3. Run Tests

```bash
# Run all deployment tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### 4. Deploy

```bash
# Deploy API to Railway
npm run deploy:railway production

# Deploy frontend to Vercel
npm run deploy:vercel all

# Or deploy individually
npm run deploy:vercel dashboard
npm run deploy:vercel landing
```

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build and run
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

## 🔧 Worker Setup

### Option 1: Tailscale (Secure VPN)

```bash
# Run setup script
npm run setup:tailscale

# Or directly
bash tailscale-setup.sh
```

**Benefits:**
- End-to-end encryption
- No public exposure
- Simple setup

### Option 2: Cloudflare Tunnel (Public HTTPS)

```bash
# Run setup script
npm run setup:cloudflare

# Or directly
bash cloudflare-tunnel-setup.sh
```

**Benefits:**
- Public HTTPS URL
- DDoS protection
- No VPN required

## 🏥 Health Checks

```bash
# Check all services
npm run health-check

# Or with custom config
bash scripts/health-check.sh production
```

The health check validates:
- API backend
- Database connection
- Redis connection
- Worker availability
- S3/R2 storage
- Frontend deployments
- Stripe API

## 💾 Database Backup

```bash
# Backup Railway database
npm run backup railway

# Backup local database
npm run backup local

# Or directly
bash scripts/backup-db.sh railway
```

Backups are stored in `backups/` directory and automatically cleaned up after 7 days.

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Categories

1. **Configuration Tests**: Validates JSON/YAML configs
2. **Script Tests**: Checks bash script syntax
3. **Security Tests**: Verifies security headers and settings
4. **Integration Tests**: Ensures all components work together

### Example Test Output

```
✓ should have valid railway.json
✓ should have valid docker-compose.yml
✓ should have executable tailscale-setup.sh
✓ should have security headers configured
✓ should use non-root user in Dockerfile

Test Suites: 1 passed, 1 total
Tests:       42 passed, 42 total
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run deployment tests |
| `npm run validate` | Validate environment variables |
| `npm run health-check` | Check all services |
| `npm run deploy:railway` | Deploy API to Railway |
| `npm run deploy:vercel` | Deploy frontend to Vercel |
| `npm run backup` | Backup database |
| `npm run setup:tailscale` | Setup Tailscale VPN |
| `npm run setup:cloudflare` | Setup Cloudflare tunnel |

## 🔐 Environment Variables

All required environment variables are documented in:
- `README_DEPLOY.md` - Complete deployment guide
- `backend/.env.example` - Example configuration

### Critical Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# S3/R2
S3_BUCKET=whisper-audio
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Worker
WORKER_MODE=local
LOCAL_WORKER_URL=http://100.x.x.x:3001
```

## 🎯 Deployment Workflows

### Railway (API)

```bash
# Method 1: Automated script
npm run deploy:railway production

# Method 2: Direct CLI
railway login
railway link
railway up
```

### Vercel (Frontend)

```bash
# Method 1: Automated script
npm run deploy:vercel all

# Method 2: Direct CLI
cd ../frontend/dashboard && vercel --prod
cd ../frontend/landing && vercel --prod
```

### Docker (Self-hosted)

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 CI/CD Integration

GitHub Actions workflows in `.github/workflows/`:

1. **test.yml**: Runs on PRs
   - Backend tests
   - Frontend tests
   - Deployment tests
   - Security scanning

2. **deploy-api.yml**: Deploys to Railway
   - Runs on main branch
   - Tests → Deploy → Migrate → Health check

3. **deploy-frontend.yml**: Deploys to Vercel
   - Runs on main branch
   - Tests → Build → Deploy

## 🛠️ Configuration Files

### railway.json

Configures Railway deployment:
- Build command with Prisma
- Health check endpoint
- Restart policy
- Environment-specific settings

### vercel-*.json

Configures Vercel deployments:
- Framework detection
- Build settings
- Security headers
- Rewrites/redirects

### Dockerfile

Multi-stage production build:
- Node 20 Alpine base
- Non-root user
- Health checks
- Optimized layers

### docker-compose.yml

Development stack:
- PostgreSQL 15
- Redis 7
- API backend
- Volumes and networks

## 📊 Monitoring

### Check Deployment Status

```bash
# Railway
railway status
railway logs

# Vercel
vercel ls
vercel logs [url]

# Docker
docker-compose ps
docker-compose logs -f
```

### Health Endpoints

- API: `GET /health`
- Worker: `GET /health`

## 🐛 Troubleshooting

### Common Issues

**Deployment fails:**
```bash
# Check logs
railway logs

# Verify environment
npm run validate
```

**Worker not connecting:**
```bash
# Test worker directly
curl http://100.x.x.x:3001/health

# Check Tailscale
tailscale status
```

**Database migration fails:**
```bash
# Check migration status
railway run npx prisma migrate status

# Re-run migrations
railway run npx prisma migrate deploy
```

See `README_DEPLOY.md` for comprehensive troubleshooting guide.

## 📚 Documentation

- **README_DEPLOY.md**: Complete deployment guide
- **TASK13_INTEGRATION_NOTES.md**: Integration with all modules
- Script comments: Each script has detailed inline documentation

## 🔒 Security

### Production Checklist

- [ ] Environment variables validated
- [ ] Stripe using live keys
- [ ] Database password is strong
- [ ] Redis authentication enabled
- [ ] S3 bucket permissions set
- [ ] Worker endpoint secured
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Docker runs as non-root

### Security Features

- Non-root Docker user
- Security headers in Vercel
- Environment validation
- Secret detection in tests
- Automated security scanning (GitHub Actions)

## 📦 Dependencies

### Required Tools

- **Node.js 20+**: Runtime
- **Docker**: Container runtime (optional)
- **Railway CLI**: Railway deployment
- **Vercel CLI**: Vercel deployment
- **Tailscale** or **Cloudflare**: Worker tunneling

### NPM Dependencies

- **jest**: Testing framework

## 🤝 Contributing

When adding new deployment configurations:

1. Add configuration file
2. Add test in `__tests__/deployment.test.js`
3. Document in `README_DEPLOY.md`
4. Update integration notes
5. Run tests: `npm test`

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Documentation**: See `README_DEPLOY.md`
- **Issues**: GitHub Issues
- **Integration**: See `TASK13_INTEGRATION_NOTES.md`

---

**Task 13 Complete** ✅

This deployment module provides production-ready configurations that integrate seamlessly with all WhisperAPI modules.

# 🚀 Deploy Now - Manual Steps

Since the deployment requires browser authentication and credential input, follow these steps in your terminal:

---

## ⚡ FASTEST WAY - Copy & Paste These Commands

### Step 1: Open Your Terminal
Open a new terminal window (not in Claude Code)

### Step 2: Navigate to Project
```bash
cd /Users/lsd/msclaude/projects/1-1/backend
```

### Step 3: Login to Railway (Opens Browser)
```bash
railway login
```
**→ Browser will open, login with GitHub or email**

### Step 4: Initialize Project
```bash
railway init
```
**→ Choose "Create new project"**
**→ Name it: whisper-api**

### Step 5: Add Database
```bash
railway add -d postgres
```

### Step 6: Add Redis
```bash
railway add -d redis
```

### Step 7: Set Environment Variables

**Replace these with YOUR values:**
```bash
# AWS Credentials
railway variables set AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY"
railway variables set AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET"
railway variables set AWS_REGION="us-east-1"
railway variables set S3_BUCKET_NAME="YOUR_BUCKET_NAME"

# Stripe
railway variables set STRIPE_SECRET_KEY="YOUR_STRIPE_KEY"

# JWT Secret (auto-generated)
railway variables set JWT_SECRET="$(openssl rand -hex 32)"

# App Config
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
```

### Step 8: Deploy!
```bash
railway up
```
**→ Wait 3-5 minutes for deployment**

### Step 9: Run Migrations
```bash
railway run npx prisma migrate deploy
```

### Step 10: Get Your URL
```bash
railway domain
```
**→ This is your live API URL!**

---

## 🎯 Test Your Deployment

```bash
# Get your URL (save this)
RAILWAY_URL=$(railway domain)

# Test health endpoint
curl https://$RAILWAY_URL/health

# Should return: {"status":"ok"}
```

---

## 📊 View Dashboard
```bash
railway open
```
**→ Opens Railway dashboard in browser**

---

## ✅ Success Checklist

After running all commands:
- [ ] Railway login successful
- [ ] Project created
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Migrations ran
- [ ] URL obtained
- [ ] Health check passes

---

## 🔧 Next Steps After Deployment

### 1. Configure Stripe Webhooks
```
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: https://YOUR_RAILWAY_URL/api/v1/stripe/webhook
4. Events to select:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Save and copy webhook signing secret
6. Add to Railway:
   railway variables set STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

### 2. Create Your First User
```bash
curl -X POST https://YOUR_URL/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"SecurePass123!"}'
```

### 3. Test Transcription
```bash
# Get API key from dashboard or database
# Then test upload:
curl -X POST https://YOUR_URL/api/v1/transcribe \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@test-audio.mp3" \
  -F "model=BASE" \
  -F "format=JSON"
```

---

## 🚨 Troubleshooting

### "Command not found: railway"
```bash
npm install -g @railway/cli
```

### "Cannot login"
Make sure you're in an interactive terminal, not running via script.

### "Database connection failed"
```bash
# Check variables
railway variables

# Restart
railway restart
```

### "Deployment failed"
```bash
# Check logs
railway logs

# View status
railway status
```

---

## 💡 Quick Commands Reference

```bash
# View logs
railway logs

# Restart service
railway restart

# Open dashboard
railway open

# Check status
railway status

# List variables
railway variables

# Update variable
railway variables set KEY="value"

# Get domain
railway domain
```

---

## 🎉 YOU'RE LIVE!

Once all steps complete:

**Your API:** https://your-project.railway.app
**Dashboard:** https://railway.app/dashboard
**GitHub:** https://github.com/sirenblock/whisper-transcription-api

**Cost:** ~$20/month on Railway Starter plan

---

## 📞 Need Help?

- **Railway Docs:** https://docs.railway.app
- **GitHub Issues:** https://github.com/sirenblock/whisper-transcription-api/issues
- **Railway Discord:** https://discord.gg/railway

---

**Estimated Time:** 10-15 minutes total

**Let's go! 🚀**

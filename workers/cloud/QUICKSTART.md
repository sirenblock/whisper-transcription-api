# Cloud Worker Quick Start

Get your Modal cloud worker running in **5 minutes**.

## Prerequisites

- Python 3.11+
- pip
- Modal account (free tier available)

## Step 1: Install Modal (30 seconds)

```bash
pip install modal
modal token new
```

This will open your browser to authenticate.

## Step 2: Configure Secrets (2 minutes)

Go to [Modal Secrets](https://modal.com/secrets) and create a secret named `whisper-secrets`:

```
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=whisper-audio
S3_REGION=us-east-1
```

Optional for Cloudflare R2:
```
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
```

## Step 3: Deploy (1 minute)

```bash
cd workers/cloud
pip install -r requirements.txt
modal deploy modal_worker.py
```

You'll get a URL like:
```
https://username--whisper-transcription-transcribe-webhook.modal.run
```

## Step 4: Configure Backend (30 seconds)

Add to `backend/.env`:

```bash
WORKER_MODE=cloud
CLOUD_WORKER_URL=https://username--whisper-transcription-transcribe-webhook.modal.run
```

## Step 5: Test (1 minute)

```bash
# Test health
modal run modal_worker.py::health_check

# Or from backend
npm test
```

## Done! 🎉

Your cloud worker is now ready to process transcriptions.

## Quick Commands

```bash
# View real-time logs
modal logs whisper-transcription --follow

# Re-deploy after changes
modal deploy modal_worker.py

# Check function status
modal function list

# Test from CLI
modal run modal_worker.py
```

## Cost Estimate

**T4 GPU @ $0.60/hour:**
- 60min audio (BASE model): ~4min processing = **$0.04**
- 60min audio (SMALL model): ~8min processing = **$0.08**

## Switching Between Local and Cloud

Just change one variable:

```bash
# Use cloud worker
WORKER_MODE=cloud

# Use local worker
WORKER_MODE=local
```

No code changes needed!

## Troubleshooting

### "Secret not found"
Create `whisper-secrets` in Modal dashboard with S3 credentials.

### "Function not found"
Run `modal deploy modal_worker.py` to deploy the worker.

### "Callback not received"
Ensure `BACKEND_URL` is publicly accessible or use ngrok for local testing.

## What's Next?

- [Full Documentation](./README.md)
- [Integration Guide](./INTEGRATION.md)
- [Modal Documentation](https://modal.com/docs)

## Support

- Check logs: `modal logs whisper-transcription`
- View dashboard: https://modal.com
- Modal Discord: https://discord.gg/modal

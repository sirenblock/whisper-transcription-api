# Cloud Worker (Modal.com)

Serverless GPU worker for Whisper transcription processing using Modal.com infrastructure.

## Overview

This worker provides:
- **Serverless GPU processing** - T4 or A10G GPUs on-demand
- **Auto-scaling** - Handles concurrent jobs automatically
- **Cost efficiency** - Pay only for actual GPU time used
- **Same interface** - Drop-in replacement for local worker

## Architecture

```
Backend → Modal Function → GPU Container
   ↓           ↓              ↓
 Queue    Download S3    Run Whisper
   ↓           ↓              ↓
Update    Upload Result  Return Status
```

## Setup

### 1. Install Modal

```bash
pip install modal
```

### 2. Authenticate with Modal

```bash
modal token new
```

This will open your browser to authenticate. Follow the prompts.

### 3. Create Modal Secrets

Go to [Modal Dashboard](https://modal.com/secrets) and create a secret named `whisper-secrets` with:

```bash
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=whisper-audio
S3_REGION=us-east-1
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # Optional for Cloudflare R2
```

### 4. Deploy Worker

```bash
cd workers/cloud
modal deploy modal_worker.py
```

You'll receive a deployment URL like:
```
https://your-username--whisper-transcription-transcribe-webhook.modal.run
```

### 5. Configure Backend

Update backend `.env`:

```bash
WORKER_MODE=cloud
CLOUD_WORKER_URL=https://your-username--whisper-transcription-transcribe-webhook.modal.run
```

## Usage

### From Backend (Programmatic)

```python
import modal

# Lookup the deployed function
stub = modal.Stub.lookup("whisper-transcription")
transcribe = stub["transcribe"]

# Call the function
job_data = {
    "transcriptionId": "trans_123",
    "userId": "user_456",
    "s3AudioUrl": "https://bucket.s3.amazonaws.com/audio/file.mp3",
    "model": "BASE",  # or "SMALL", "MEDIUM"
    "format": "JSON",  # or "SRT", "VTT", "TXT"
    "callbackUrl": "https://api.yourapp.com/webhooks/transcription"  # Optional
}

result = transcribe.remote(job_data)
print(result)
# {
#   "success": true,
#   "s3ResultUrl": "s3://bucket/results/user_456/trans_123.json",
#   "durationSeconds": 125.5,
#   "processingTime": 15.2,
#   "language": "en"
# }
```

### From Backend (HTTP Webhook)

```javascript
// backend/src/services/cloudWorker.service.js
const axios = require('axios');

async function submitTranscriptionJob(jobData) {
  const response = await axios.post(
    process.env.CLOUD_WORKER_URL,
    jobData,
    { timeout: 60000 }
  );

  return response.data;
}
```

### Local Testing

```bash
# Test the function locally (runs on Modal infrastructure)
modal run modal_worker.py

# Or test with custom job data
modal run modal_worker.py --job-data '{"transcriptionId":"test",...}'
```

## Performance

### Model Comparison (T4 GPU)

| Model  | Size | Speed (RTF) | Quality | Cost/Hour |
|--------|------|-------------|---------|-----------|
| BASE   | 74M  | 16x         | Good    | ~$0.60    |
| SMALL  | 244M | 8x          | Better  | ~$0.60    |
| MEDIUM | 769M | 4x          | Best    | ~$0.60    |

**RTF (Real-Time Factor):** 16x = processes 60min audio in ~3.75min

### Estimated Costs

**T4 GPU @ $0.60/hour:**
- 60min audio (BASE model): ~4min processing = **$0.04**
- 60min audio (SMALL model): ~8min processing = **$0.08**
- 60min audio (MEDIUM model): ~15min processing = **$0.15**

**A10G GPU @ $1.10/hour (2x faster):**
- 60min audio (BASE model): ~2min processing = **$0.04**
- 60min audio (MEDIUM model): ~8min processing = **$0.15**

## GPU Options

### T4 (Default - Good for most workloads)
```python
@stub.function(gpu="T4", ...)
```
- Cost: ~$0.60/hour
- Memory: 16GB
- Good for BASE and SMALL models

### A10G (Faster - Better for MEDIUM model)
```python
@stub.function(gpu="A10G", ...)
```
- Cost: ~$1.10/hour
- Memory: 24GB
- 2x faster than T4

### A100 (Fastest - Overkill for Whisper)
```python
@stub.function(gpu="A100", ...)
```
- Cost: ~$4/hour
- Memory: 40-80GB
- Best for very large batches

## Configuration

### Timeout Settings

```python
@stub.function(
    timeout=1800,  # 30 minutes (default)
    # Adjust based on max expected file duration
)
```

### Memory Allocation

```python
@stub.function(
    memory=8192,  # 8GB RAM (default)
    # Increase for MEDIUM model or large files
)
```

### Retries

```python
@stub.function(
    retries=2,  # Auto-retry on failure
)
```

## Monitoring

### View Logs

```bash
# Real-time logs
modal logs whisper-transcription

# Filter by function
modal logs whisper-transcription transcribe
```

### Check Function Status

```bash
modal function list
```

### View Cost Analytics

Check [Modal Dashboard](https://modal.com) → Usage

## Debugging

### Test Locally with Modal

```bash
# Run function on Modal but trigger from CLI
modal run modal_worker.py
```

### Check Function Health

```python
stub = modal.Stub.lookup("whisper-transcription")
health = stub["health_check"]
print(health.remote())
# {"status": "healthy", "worker": "cloud", "timestamp": "..."}
```

### Common Issues

#### 1. Secret Not Found
```
Error: Secret 'whisper-secrets' not found
```
**Solution:** Create secret in Modal dashboard with all required env vars

#### 2. GPU Quota Exceeded
```
Error: GPU quota exceeded
```
**Solution:** Request quota increase in Modal settings or switch to smaller GPU

#### 3. Function Timeout
```
Error: Function timed out after 1800s
```
**Solution:** Increase timeout or optimize model choice

## Integration with Backend

### Switch from Local to Cloud

**Before (Local Worker):**
```javascript
// backend/src/services/jobQueue.service.js
const queue = new Queue('transcription', { connection: redis });
await queue.add('transcribe', jobData);
```

**After (Cloud Worker):**
```javascript
// backend/src/services/jobQueue.service.js
if (process.env.WORKER_MODE === 'cloud') {
  // Call Modal directly
  const result = await axios.post(process.env.CLOUD_WORKER_URL, jobData);
  // Update database immediately
  await updateTranscription(result);
} else {
  // Use BullMQ for local worker
  await queue.add('transcribe', jobData);
}
```

### Callback Integration

The worker can send callbacks when jobs complete:

```javascript
// backend/src/routes/webhooks.js
app.post('/webhooks/transcription', async (req, res) => {
  const { transcriptionId, status, s3ResultUrl, durationSeconds, error } = req.body;

  if (status === 'COMPLETED') {
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        status: 'COMPLETED',
        s3ResultUrl,
        durationSeconds,
        completedAt: new Date()
      }
    });
  } else {
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        status: 'FAILED',
        errorMessage: error
      }
    });
  }

  res.json({ success: true });
});
```

## Cost Optimization Tips

1. **Use BASE model by default** - 2x faster than SMALL, cheaper
2. **Batch similar requests** - Modal keeps containers warm
3. **Set appropriate timeouts** - Don't pay for hung processes
4. **Monitor usage** - Check Modal dashboard weekly
5. **Use T4 for most workloads** - A10G only if needed

## Deployment Checklist

- [ ] Modal CLI installed and authenticated
- [ ] Secrets created in Modal dashboard
- [ ] Worker deployed: `modal deploy modal_worker.py`
- [ ] Backend `.env` updated with `WORKER_MODE=cloud`
- [ ] Backend has cloud worker URL configured
- [ ] Webhook endpoint created for callbacks
- [ ] Test transcription successful
- [ ] Monitoring dashboard bookmarked

## Support

### Modal Documentation
- [Modal Docs](https://modal.com/docs)
- [GPU Guide](https://modal.com/docs/guide/gpu)
- [Secrets Guide](https://modal.com/docs/guide/secrets)

### Whisper Documentation
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Model Card](https://github.com/openai/whisper/blob/main/model-card.md)

## Updating the Worker

```bash
# Make changes to modal_worker.py

# Deploy updates
modal deploy modal_worker.py

# Verify deployment
modal function list

# Test updated function
modal run modal_worker.py
```

Changes are deployed instantly - no downtime!

## Cleanup

```bash
# Remove deployment
modal app stop whisper-transcription

# Delete all Modal resources
modal app delete whisper-transcription
```

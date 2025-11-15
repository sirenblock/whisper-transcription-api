"""
@module CloudWorker
@description Modal.com serverless GPU worker for Whisper transcription processing

@requires modal
@requires openai-whisper
@requires boto3
@requires requests

@example
# Deploy:
modal deploy modal_worker.py

# Call from backend:
result = transcribe_function.remote(job_data)

@exports {Function} transcribe - Main transcription processing function
@exports {Function} health_check - Worker health check endpoint
"""

import modal
import requests
import os
import json
from pathlib import Path
from typing import Dict, Any

# Initialize Modal stub
stub = modal.Stub("whisper-transcription")

# Create GPU image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "openai-whisper==20231117",
        "boto3==1.34.0",
        "requests==2.31.0",
        "ffmpeg-python==0.2.0"
    )
    .apt_install("ffmpeg")
)


@stub.function(
    image=image,
    gpu="T4",  # NVIDIA T4 GPU - upgrade to "A10G" for 2x speed
    timeout=1800,  # 30 minute timeout for large files
    memory=8192,  # 8GB RAM
    secret=modal.Secret.from_name("whisper-secrets"),
    retries=2,  # Auto-retry on failure
)
def transcribe(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process transcription job on GPU

    Args:
        job_data: {
            "transcriptionId": str,
            "userId": str,
            "s3AudioUrl": str,
            "model": "BASE" | "SMALL" | "MEDIUM",
            "format": "JSON" | "SRT" | "VTT" | "TXT",
            "callbackUrl": str (optional)
        }

    Returns:
        {
            "success": bool,
            "s3ResultUrl": str (if success),
            "durationSeconds": float (if success),
            "error": str (if failure)
        }
    """
    import whisper
    import tempfile
    import boto3
    from botocore.client import Config
    import time

    transcription_id = job_data["transcriptionId"]
    s3_audio_url = job_data["s3AudioUrl"]
    model_name = job_data["model"].lower()
    output_format = job_data["format"].lower()
    user_id = job_data["userId"]
    callback_url = job_data.get("callbackUrl")

    log_info("transcribe_start", {
        "transcriptionId": transcription_id,
        "model": model_name,
        "format": output_format
    })

    # Initialize S3 client
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ["S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["S3_SECRET_KEY"],
        endpoint_url=os.environ.get("S3_ENDPOINT"),
        region_name=os.environ.get("S3_REGION", "us-east-1"),
        config=Config(signature_version="s3v4"),
    )

    audio_path = None

    try:
        # Step 1: Download audio file
        log_info("download_start", {"url": s3_audio_url[:50] + "..."})
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as audio_file:
            response = requests.get(s3_audio_url, timeout=300)
            response.raise_for_status()
            audio_file.write(response.content)
            audio_path = audio_file.name

        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        log_info("download_complete", {"size_mb": round(file_size_mb, 2)})

        # Step 2: Load Whisper model
        log_info("model_load_start", {"model": model_name})
        start_time = time.time()
        model = whisper.load_model(model_name)
        load_time = time.time() - start_time
        log_info("model_load_complete", {"time_seconds": round(load_time, 2)})

        # Step 3: Transcribe audio
        log_info("transcription_start", {"model": model_name})
        transcribe_start = time.time()

        result = model.transcribe(
            audio_path,
            verbose=False,
            language=None,  # Auto-detect language
            task="transcribe"  # Could be "translate" for English translation
        )

        transcribe_time = time.time() - transcribe_start
        duration_seconds = result["segments"][-1]["end"] if result["segments"] else 0

        log_info("transcription_complete", {
            "duration": round(duration_seconds, 2),
            "processing_time": round(transcribe_time, 2),
            "real_time_factor": round(duration_seconds / transcribe_time, 2)
        })

        # Step 4: Format output
        output_data = format_output(result, output_format)

        # Step 5: Upload result to S3
        result_key = f"results/{user_id}/{transcription_id}.{output_format}"

        content_types = {
            "json": "application/json",
            "srt": "text/srt",
            "vtt": "text/vtt",
            "txt": "text/plain"
        }

        s3.put_object(
            Bucket=os.environ["S3_BUCKET"],
            Key=result_key,
            Body=output_data.encode("utf-8"),
            ContentType=content_types.get(output_format, "text/plain"),
            Metadata={
                "transcription-id": transcription_id,
                "user-id": user_id,
                "model": model_name,
                "duration": str(duration_seconds)
            }
        )

        s3_result_url = f"s3://{os.environ['S3_BUCKET']}/{result_key}"
        log_info("upload_complete", {"key": result_key})

        # Step 6: Cleanup temporary file
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)

        result_data = {
            "success": True,
            "s3ResultUrl": s3_result_url,
            "durationSeconds": duration_seconds,
            "processingTime": round(transcribe_time, 2),
            "language": result.get("language", "unknown")
        }

        # Step 7: Send callback if provided
        if callback_url:
            try:
                requests.post(
                    callback_url,
                    json={
                        "transcriptionId": transcription_id,
                        "status": "COMPLETED",
                        **result_data
                    },
                    timeout=10
                )
            except Exception as e:
                log_error("callback_failed", str(e))

        log_info("job_complete", {"transcriptionId": transcription_id})
        return result_data

    except requests.RequestException as e:
        error_msg = f"Failed to download audio: {str(e)}"
        log_error("download_error", error_msg)
        return handle_error(transcription_id, error_msg, callback_url, audio_path)

    except Exception as e:
        error_msg = f"Transcription failed: {str(e)}"
        log_error("transcription_error", error_msg)
        return handle_error(transcription_id, error_msg, callback_url, audio_path)


def handle_error(
    transcription_id: str,
    error_msg: str,
    callback_url: str = None,
    audio_path: str = None
) -> Dict[str, Any]:
    """Handle errors and cleanup"""

    # Cleanup temp file
    if audio_path and os.path.exists(audio_path):
        try:
            os.unlink(audio_path)
        except:
            pass

    # Send error callback
    if callback_url:
        try:
            requests.post(
                callback_url,
                json={
                    "transcriptionId": transcription_id,
                    "status": "FAILED",
                    "error": error_msg
                },
                timeout=10
            )
        except:
            pass

    return {
        "success": False,
        "error": error_msg
    }


def format_output(result: Dict[str, Any], format_type: str) -> str:
    """
    Format Whisper output to requested format

    Args:
        result: Whisper transcription result
        format_type: "json" | "srt" | "vtt" | "txt"

    Returns:
        Formatted output string
    """
    if format_type == "json":
        return json.dumps(result, indent=2, ensure_ascii=False)

    elif format_type == "srt":
        output = []
        for i, segment in enumerate(result["segments"], 1):
            start = format_timestamp_srt(segment["start"])
            end = format_timestamp_srt(segment["end"])
            text = segment["text"].strip()
            output.append(f"{i}\n{start} --> {end}\n{text}\n")
        return "\n".join(output)

    elif format_type == "vtt":
        output = ["WEBVTT\n"]
        for segment in result["segments"]:
            start = format_timestamp_srt(segment["start"])
            end = format_timestamp_srt(segment["end"])
            text = segment["text"].strip()
            output.append(f"{start} --> {end}\n{text}\n")
        return "\n".join(output)

    else:  # txt
        return result["text"].strip()


def format_timestamp_srt(seconds: float) -> str:
    """Format timestamp for SRT/VTT (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def log_info(event: str, data: Dict[str, Any] = None):
    """Structured logging for info events"""
    log_entry = {
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "level": "info",
        "module": "cloud-worker",
        "event": event,
        "data": data or {}
    }
    print(json.dumps(log_entry))


def log_error(event: str, error: str):
    """Structured logging for errors"""
    log_entry = {
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "level": "error",
        "module": "cloud-worker",
        "event": event,
        "error": error
    }
    print(json.dumps(log_entry))


@stub.function(
    image=image,
    secret=modal.Secret.from_name("whisper-secrets"),
)
def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "worker": "cloud",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }


@stub.local_entrypoint()
def main():
    """Local testing entrypoint"""

    # Test with a sample job
    test_job = {
        "transcriptionId": "test_123",
        "userId": "user_test",
        "s3AudioUrl": "https://example.com/test.mp3",
        "model": "BASE",
        "format": "JSON",
    }

    print("Running test transcription...")
    result = transcribe.remote(test_job)
    print(json.dumps(result, indent=2))

    print("\nRunning health check...")
    health = health_check.remote()
    print(json.dumps(health, indent=2))


@stub.webhook(method="POST", label="transcribe-webhook")
def transcribe_webhook(job_data: Dict[str, Any]):
    """
    HTTP webhook endpoint for triggering transcriptions
    Alternative to calling .remote() directly
    """
    return transcribe.remote(job_data)

"""
Tests for Modal Cloud Worker

Run with: pytest test_modal_worker.py -v
"""

import pytest
import json
import sys
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modal_worker import (
    format_output,
    format_timestamp_srt,
    log_info,
    log_error,
    handle_error
)


class TestFormatTimestamp:
    """Test SRT timestamp formatting"""

    def test_zero_seconds(self):
        result = format_timestamp_srt(0)
        assert result == "00:00:00,000"

    def test_subsecond(self):
        result = format_timestamp_srt(0.5)
        assert result == "00:00:00,500"

    def test_seconds_only(self):
        result = format_timestamp_srt(45.250)
        assert result == "00:00:45,250"

    def test_minutes_and_seconds(self):
        result = format_timestamp_srt(125.5)
        assert result == "00:02:05,500"

    def test_hours_minutes_seconds(self):
        result = format_timestamp_srt(3725.123)
        assert result == "01:02:05,123"

    def test_large_duration(self):
        result = format_timestamp_srt(7384.999)
        assert result == "02:03:04,999"


class TestFormatOutput:
    """Test output format conversion"""

    @pytest.fixture
    def sample_whisper_result(self):
        return {
            "text": "Hello world. This is a test.",
            "segments": [
                {
                    "start": 0.0,
                    "end": 2.5,
                    "text": " Hello world."
                },
                {
                    "start": 2.5,
                    "end": 5.0,
                    "text": " This is a test."
                }
            ],
            "language": "en"
        }

    def test_json_format(self, sample_whisper_result):
        result = format_output(sample_whisper_result, "json")

        # Should be valid JSON
        parsed = json.loads(result)
        assert parsed["text"] == "Hello world. This is a test."
        assert len(parsed["segments"]) == 2
        assert parsed["language"] == "en"

    def test_srt_format(self, sample_whisper_result):
        result = format_output(sample_whisper_result, "srt")

        expected = """1
00:00:00,000 --> 00:00:02,500
Hello world.

2
00:00:02,500 --> 00:00:05,000
This is a test."""

        assert result.strip() == expected.strip()

    def test_vtt_format(self, sample_whisper_result):
        result = format_output(sample_whisper_result, "vtt")

        assert result.startswith("WEBVTT")
        assert "00:00:00,000 --> 00:00:02,500" in result
        assert "Hello world." in result
        assert "This is a test." in result

    def test_txt_format(self, sample_whisper_result):
        result = format_output(sample_whisper_result, "txt")

        assert result == "Hello world. This is a test."

    def test_empty_segments(self):
        result_data = {
            "text": "Single line",
            "segments": []
        }

        txt_result = format_output(result_data, "txt")
        assert txt_result == "Single line"

        srt_result = format_output(result_data, "srt")
        assert srt_result == ""

    def test_unicode_handling(self):
        result_data = {
            "text": "Héllo wörld 你好",
            "segments": [
                {"start": 0, "end": 2, "text": " Héllo wörld 你好"}
            ]
        }

        json_result = format_output(result_data, "json")
        parsed = json.loads(json_result)
        assert "Héllo wörld 你好" in parsed["text"]


class TestLogging:
    """Test logging functions"""

    @patch('builtins.print')
    def test_log_info(self, mock_print):
        log_info("test_event", {"key": "value"})

        # Should print JSON
        args = mock_print.call_args[0][0]
        log_entry = json.loads(args)

        assert log_entry["level"] == "info"
        assert log_entry["module"] == "cloud-worker"
        assert log_entry["event"] == "test_event"
        assert log_entry["data"]["key"] == "value"
        assert "timestamp" in log_entry

    @patch('builtins.print')
    def test_log_error(self, mock_print):
        log_error("error_event", "Something went wrong")

        args = mock_print.call_args[0][0]
        log_entry = json.loads(args)

        assert log_entry["level"] == "error"
        assert log_entry["event"] == "error_event"
        assert log_entry["error"] == "Something went wrong"

    @patch('builtins.print')
    def test_log_info_no_data(self, mock_print):
        log_info("simple_event")

        args = mock_print.call_args[0][0]
        log_entry = json.loads(args)

        assert log_entry["data"] == {}


class TestHandleError:
    """Test error handling function"""

    @patch('requests.post')
    @patch('os.path.exists')
    @patch('os.unlink')
    def test_handle_error_with_callback(self, mock_unlink, mock_exists, mock_post):
        mock_exists.return_value = True

        result = handle_error(
            transcription_id="trans_123",
            error_msg="Test error",
            callback_url="https://api.example.com/callback",
            audio_path="/tmp/test.mp3"
        )

        # Should return error response
        assert result["success"] is False
        assert result["error"] == "Test error"

        # Should cleanup temp file
        mock_unlink.assert_called_once_with("/tmp/test.mp3")

        # Should send callback
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == "https://api.example.com/callback"
        assert call_args[1]["json"]["transcriptionId"] == "trans_123"
        assert call_args[1]["json"]["status"] == "FAILED"

    @patch('os.path.exists')
    @patch('os.unlink')
    def test_handle_error_without_callback(self, mock_unlink, mock_exists):
        mock_exists.return_value = True

        result = handle_error(
            transcription_id="trans_123",
            error_msg="Test error",
            audio_path="/tmp/test.mp3"
        )

        assert result["success"] is False
        assert result["error"] == "Test error"
        mock_unlink.assert_called_once()

    @patch('os.path.exists')
    def test_handle_error_no_file(self, mock_exists):
        mock_exists.return_value = False

        result = handle_error(
            transcription_id="trans_123",
            error_msg="Test error"
        )

        assert result["success"] is False
        assert result["error"] == "Test error"

    @patch('requests.post')
    @patch('os.unlink')
    @patch('os.path.exists')
    def test_handle_error_callback_fails_gracefully(self, mock_exists, mock_unlink, mock_post):
        mock_exists.return_value = False
        mock_post.side_effect = Exception("Callback failed")

        # Should not raise exception even if callback fails
        result = handle_error(
            transcription_id="trans_123",
            error_msg="Test error",
            callback_url="https://api.example.com/callback"
        )

        assert result["success"] is False


class TestIntegration:
    """Integration tests for the worker (require Modal setup)"""

    @pytest.mark.integration
    @patch.dict(os.environ, {
        'S3_ACCESS_KEY': 'test_key',
        'S3_SECRET_KEY': 'test_secret',
        'S3_BUCKET': 'test-bucket',
        'S3_REGION': 'us-east-1'
    })
    def test_job_data_structure(self):
        """Test that job data structure is correct"""
        job_data = {
            "transcriptionId": "trans_abc123",
            "userId": "user_xyz789",
            "s3AudioUrl": "https://bucket.s3.amazonaws.com/audio/test.mp3",
            "model": "BASE",
            "format": "JSON",
            "callbackUrl": "https://api.example.com/webhooks/transcription"
        }

        # Validate required fields
        assert "transcriptionId" in job_data
        assert "userId" in job_data
        assert "s3AudioUrl" in job_data
        assert "model" in job_data
        assert "format" in job_data

        # Validate model values
        assert job_data["model"] in ["BASE", "SMALL", "MEDIUM"]

        # Validate format values
        assert job_data["format"] in ["JSON", "SRT", "VTT", "TXT"]

    def test_response_structure(self):
        """Test expected response structure"""
        success_response = {
            "success": True,
            "s3ResultUrl": "s3://bucket/results/user_123/trans_456.json",
            "durationSeconds": 125.5,
            "processingTime": 15.2,
            "language": "en"
        }

        error_response = {
            "success": False,
            "error": "Transcription failed: Invalid audio format"
        }

        # Validate success response
        assert success_response["success"] is True
        assert "s3ResultUrl" in success_response
        assert "durationSeconds" in success_response
        assert isinstance(success_response["durationSeconds"], (int, float))

        # Validate error response
        assert error_response["success"] is False
        assert "error" in error_response
        assert isinstance(error_response["error"], str)


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_very_long_audio(self):
        """Test timestamp formatting for long audio files"""
        # 10 hours
        result = format_timestamp_srt(36000)
        assert result == "10:00:00,000"

    def test_empty_text_segments(self):
        """Test handling of empty segments"""
        result_data = {
            "text": "",
            "segments": [
                {"start": 0, "end": 1, "text": ""}
            ]
        }

        srt = format_output(result_data, "srt")
        # Should handle gracefully
        assert isinstance(srt, str)

    def test_special_characters_in_text(self):
        """Test special characters handling"""
        result_data = {
            "text": "Test with <tags> & \"quotes\" and 'apostrophes'",
            "segments": [
                {"start": 0, "end": 2, "text": " Test with <tags> & \"quotes\" and 'apostrophes'"}
            ]
        }

        json_output = format_output(result_data, "json")
        parsed = json.loads(json_output)
        assert "<tags>" in parsed["text"]
        assert "&" in parsed["text"]

    def test_very_short_segments(self):
        """Test very short audio segments"""
        result = format_timestamp_srt(0.001)
        assert result == "00:00:00,001"

    def test_multiple_languages(self):
        """Test multi-language text"""
        result_data = {
            "text": "Hello 你好 Bonjour مرحبا",
            "segments": [
                {"start": 0, "end": 5, "text": " Hello 你好 Bonjour مرحبا"}
            ]
        }

        for fmt in ["json", "srt", "vtt", "txt"]:
            output = format_output(result_data, fmt)
            assert isinstance(output, str)
            assert len(output) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

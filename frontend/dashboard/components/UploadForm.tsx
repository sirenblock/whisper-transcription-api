/**
 * @module UploadForm
 * @description Upload form component with drag-and-drop support for audio/video files
 *
 * @requires react-dropzone
 * @requires lib/api
 *
 * @example
 * <UploadForm apiKey="wtr_live_xxx" onUploadComplete={(id) => console.log(id)} />
 *
 * @exports {Component} UploadForm - Upload form with drag-drop
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ApiClient, isValidAudioFile, formatFileSize, ApiError } from '../lib/api';
import type { WhisperModel, OutputFormat } from '../lib/types';

interface UploadFormProps {
  apiKey: string;
  onUploadComplete?: (transcriptionId: string) => void;
  onError?: (error: Error) => void;
}

export default function UploadForm({ apiKey, onUploadComplete, onError }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState<WhisperModel>('BASE');
  const [format, setFormat] = useState<OutputFormat>('JSON');
  const [error, setError] = useState<string | null>(null);

  const maxFileSize = 500 * 1024 * 1024; // 500 MB

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${formatFileSize(maxFileSize)}`);
      } else {
        setError('Invalid file type. Please upload an audio or video file.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];

      if (!isValidAudioFile(selectedFile)) {
        setError('Invalid file type. Supported formats: MP3, WAV, M4A, MP4, MPEG, WEBM');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  }, [maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.mp4', '.mpeg', '.webm'],
      'video/mp4': ['.mp4'],
      'video/mpeg': ['.mpeg'],
      'video/webm': ['.webm'],
    },
    maxFiles: 1,
    maxSize: maxFileSize,
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !apiKey) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const client = new ApiClient(apiKey);

      // Simulate progress (actual S3 upload doesn't provide progress easily)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const transcriptionId = await client.transcribe(file, model, format);

      clearInterval(progressInterval);
      setProgress(100);

      // Reset form
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setUploading(false);
        onUploadComplete?.(transcriptionId);
      }, 500);

    } catch (err) {
      setUploading(false);
      setProgress(0);

      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Upload failed. Please try again.');
      }

      onError?.(err instanceof Error ? err : new Error('Upload failed'));
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audio/Video File
          </label>

          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {isDragActive ? (
                  <span className="font-medium text-primary-600">Drop file here</span>
                ) : (
                  <>
                    <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                MP3, WAV, M4A, MP4, MPEG, WEBM up to {formatFileSize(maxFileSize)}
              </p>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-10 w-10 text-primary-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Model Selection */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            Whisper Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value as WhisperModel)}
            disabled={uploading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:bg-gray-100"
          >
            <option value="BASE">Base (Fastest, Good Accuracy)</option>
            <option value="SMALL">Small (Balanced)</option>
            <option value="MEDIUM">Medium (Slowest, Best Accuracy)</option>
          </select>
        </div>

        {/* Format Selection */}
        <div>
          <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
            Output Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as OutputFormat)}
            disabled={uploading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:bg-gray-100"
          >
            <option value="JSON">JSON (Detailed with timestamps)</option>
            <option value="SRT">SRT (SubRip subtitles)</option>
            <option value="VTT">VTT (WebVTT subtitles)</option>
            <option value="TXT">TXT (Plain text only)</option>
          </select>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || uploading || !apiKey}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload & Transcribe'}
        </button>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center">
          Your file will be processed and the transcription will appear in your dashboard.
        </p>
      </div>
    </form>
  );
}

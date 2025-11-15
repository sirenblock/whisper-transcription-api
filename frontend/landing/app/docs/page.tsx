/**
 * @module DocsPage
 * @description Documentation preview page with quick start guide
 *
 * Features:
 * - Quick start guide
 * - API examples
 * - Code snippets
 * - Links to full documentation
 *
 * @example
 * Rendered at: /docs
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation - WhisperAPI',
  description: 'Get started with WhisperAPI in minutes. Complete API reference, code examples, and integration guides.',
};

export default function DocsPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="section-container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Documentation
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Everything you need to integrate WhisperAPI into your application
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary">
                Get API Key
              </Link>
              <a
                href="https://github.com/whisperapi/whisperapi"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-20 bg-white">
        <div className="section-container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Quick Start</h2>

          {/* Step 1 */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Get Your API Key</h3>
            </div>
            <p className="text-gray-700 mb-4 ml-11">
              Sign up for a free account and generate your API key from the dashboard.
            </p>
            <div className="code-block ml-11">
              <code>
                # Your API key will look like this:
                <br />
                wtr_live_abc123def456ghi789jkl012mno345pq
              </code>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Upload Audio File</h3>
            </div>
            <p className="text-gray-700 mb-4 ml-11">
              Send a POST request to <code className="bg-gray-100 px-2 py-1 rounded text-sm">/v1/transcribe</code> with your audio file.
            </p>
            <div className="code-block ml-11">
              <code>
                curl -X POST https://api.whisperapi.com/v1/transcribe \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer wtr_live_YOUR_API_KEY" \<br />
                &nbsp;&nbsp;-F "file=@podcast.mp3" \<br />
                &nbsp;&nbsp;-F "model=base" \<br />
                &nbsp;&nbsp;-F "format=json"
              </code>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Get Transcription ID</h3>
            </div>
            <p className="text-gray-700 mb-4 ml-11">
              The API returns a transcription ID immediately. Use it to check status.
            </p>
            <div className="code-block ml-11">
              <code>
                {'{'}<br />
                &nbsp;&nbsp;"success": true,<br />
                &nbsp;&nbsp;"data": {'{'}<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"transcriptionId": "trans_abc123",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"status": "QUEUED",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"estimatedTime": 180<br />
                &nbsp;&nbsp;{'}'}<br />
                {'}'}
              </code>
            </div>
          </div>

          {/* Step 4 */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                4
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Poll for Results</h3>
            </div>
            <p className="text-gray-700 mb-4 ml-11">
              Check the status endpoint until transcription is complete.
            </p>
            <div className="code-block ml-11">
              <code>
                curl https://api.whisperapi.com/v1/status/trans_abc123 \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer wtr_live_YOUR_API_KEY"
              </code>
            </div>
          </div>

          {/* Step 5 */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                5
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Download Results</h3>
            </div>
            <p className="text-gray-700 mb-4 ml-11">
              Once complete, download your transcription in your chosen format.
            </p>
            <div className="code-block ml-11">
              <code>
                curl https://api.whisperapi.com/v1/download/trans_abc123 \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer wtr_live_YOUR_API_KEY"
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 bg-gray-50">
        <div className="section-container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Code Examples</h2>

          <div className="space-y-8">
            {/* Python */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Python</h3>
              <div className="code-block">
                <code>
                  import requests<br />
                  <br />
                  API_KEY = "wtr_live_YOUR_API_KEY"<br />
                  <br />
                  # Upload audio<br />
                  with open("audio.mp3", "rb") as f:<br />
                  &nbsp;&nbsp;response = requests.post(<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;"https://api.whisperapi.com/v1/transcribe",<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;headers={'{'}{"Authorization": f"Bearer {'{'}API_KEY{'}'}"{'}'},<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;files={'{'}{"file": f{'}'},<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;data={'{'}{"model": "base", "format": "json"{'}'}<br />
                  &nbsp;&nbsp;)<br />
                  <br />
                  transcription_id = response.json()["data"]["transcriptionId"]<br />
                  print(f"Transcription ID: {'{'}transcription_id{'}'}")
                </code>
              </div>
            </div>

            {/* Node.js */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Node.js</h3>
              <div className="code-block">
                <code>
                  const axios = require('axios');<br />
                  const FormData = require('form-data');<br />
                  const fs = require('fs');<br />
                  <br />
                  const API_KEY = 'wtr_live_YOUR_API_KEY';<br />
                  <br />
                  const formData = new FormData();<br />
                  formData.append('file', fs.createReadStream('audio.mp3'));<br />
                  formData.append('model', 'base');<br />
                  formData.append('format', 'json');<br />
                  <br />
                  axios.post('https://api.whisperapi.com/v1/transcribe', formData, {'{'}<br />
                  &nbsp;&nbsp;headers: {'{'}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;'Authorization': `Bearer ${'{'}API_KEY{'}'}`,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;...formData.getHeaders()<br />
                  &nbsp;&nbsp;{'}'}<br />
                  {'}'}).then(res ={'>'} console.log(res.data));
                </code>
              </div>
            </div>

            {/* JavaScript (Fetch) */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">JavaScript (Browser)</h3>
              <div className="code-block">
                <code>
                  const API_KEY = 'wtr_live_YOUR_API_KEY';<br />
                  <br />
                  const formData = new FormData();<br />
                  formData.append('file', audioFile);<br />
                  formData.append('model', 'base');<br />
                  formData.append('format', 'json');<br />
                  <br />
                  const response = await fetch('https://api.whisperapi.com/v1/transcribe', {'{'}<br />
                  &nbsp;&nbsp;method: 'POST',<br />
                  &nbsp;&nbsp;headers: {'{'} 'Authorization': `Bearer ${'{'}API_KEY{'}'}` {'}'},<br />
                  &nbsp;&nbsp;body: formData<br />
                  {'}'});<br />
                  <br />
                  const data = await response.json();<br />
                  console.log(data.data.transcriptionId);
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section className="py-20 bg-white">
        <div className="section-container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">API Reference</h2>

          <div className="space-y-8">
            {/* POST /transcribe */}
            <div className="card">
              <div className="flex items-center mb-4">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md font-mono text-sm font-semibold mr-3">
                  POST
                </span>
                <code className="text-lg">/v1/transcribe</code>
              </div>
              <p className="text-gray-700 mb-4">Upload an audio file for transcription.</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-sm text-gray-900 mb-2">Parameters:</p>
                <ul className="space-y-2 text-sm">
                  <li><code className="bg-white px-2 py-1 rounded">file</code> - Audio file (required)</li>
                  <li><code className="bg-white px-2 py-1 rounded">model</code> - base | small | medium (default: base)</li>
                  <li><code className="bg-white px-2 py-1 rounded">format</code> - json | srt | vtt | txt (default: json)</li>
                </ul>
              </div>
            </div>

            {/* GET /status/:id */}
            <div className="card">
              <div className="flex items-center mb-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-mono text-sm font-semibold mr-3">
                  GET
                </span>
                <code className="text-lg">/v1/status/:transcriptionId</code>
              </div>
              <p className="text-gray-700 mb-4">Check the status of a transcription job.</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-sm text-gray-900 mb-2">Response:</p>
                <div className="code-block text-xs">
                  <code>
                    {'{'}<br />
                    &nbsp;&nbsp;"status": "PROCESSING",<br />
                    &nbsp;&nbsp;"progress": 45,<br />
                    &nbsp;&nbsp;"estimatedTimeRemaining": 90<br />
                    {'}'}
                  </code>
                </div>
              </div>
            </div>

            {/* GET /download/:id */}
            <div className="card">
              <div className="flex items-center mb-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-mono text-sm font-semibold mr-3">
                  GET
                </span>
                <code className="text-lg">/v1/download/:transcriptionId</code>
              </div>
              <p className="text-gray-700 mb-4">Download the completed transcription.</p>
            </div>

            {/* GET /usage */}
            <div className="card">
              <div className="flex items-center mb-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-mono text-sm font-semibold mr-3">
                  GET
                </span>
                <code className="text-lg">/v1/usage</code>
              </div>
              <p className="text-gray-700 mb-4">Get your current usage statistics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-blue-500">
        <div className="section-container text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Building?</h2>
          <p className="text-lg mb-8 opacity-90">
            Get your free API key and start transcribing in minutes
          </p>
          <Link href="/signup" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
            Get Started for Free
          </Link>
        </div>
      </section>
    </>
  );
}

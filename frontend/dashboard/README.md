# WhisperAPI Dashboard

A modern, responsive Next.js dashboard for uploading audio/video files and managing transcriptions with the WhisperAPI backend.

## Features

- 📤 **Drag-and-drop file upload** with support for multiple audio/video formats
- 📄 **Real-time transcription tracking** with auto-refresh
- 🔑 **API key management** with secure local storage
- 📊 **Transcription history** with download capabilities
- 🎨 **Beautiful UI** built with Tailwind CSS
- ⚡ **Fast and responsive** with Next.js 14 App Router
- 🧪 **Comprehensive test coverage** (80%+)

## Tech Stack

- **Framework:** Next.js 14.x (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3.3
- **HTTP Client:** Axios 1.5
- **File Upload:** react-dropzone 14.2
- **Testing:** Jest + React Testing Library
- **Date Formatting:** date-fns

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- WhisperAPI backend running (default: http://localhost:3000)

### Installation

1. **Clone or navigate to the dashboard directory:**
   ```bash
   cd frontend/dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   ```
   http://localhost:3002
   ```

## Project Structure

```
frontend/dashboard/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── globals.css             # Global styles
│   ├── upload/
│   │   └── page.tsx            # Upload page (main)
│   ├── transcriptions/
│   │   └── page.tsx            # Transcriptions list page
│   └── api-keys/
│       └── page.tsx            # API key management page
│
├── components/
│   ├── UploadForm.tsx          # File upload with drag-drop
│   ├── TranscriptionList.tsx   # Transcription list with polling
│   ├── ApiKeyManager.tsx       # API key CRUD operations
│   └── Navigation.tsx          # Main navigation bar
│
├── lib/
│   ├── api.ts                  # API client class
│   └── types.ts                # TypeScript type definitions
│
├── hooks/
│   └── useApiKey.ts            # API key localStorage hook
│
├── __tests__/                  # Jest tests
│   ├── lib/
│   ├── components/
│   └── hooks/
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

## Usage

### 1. Set Up API Key

On first visit, you'll be prompted to enter your API key. You can:
- Use an existing API key from the backend
- Create a new one via the API Keys page
- The key is stored securely in your browser's localStorage

### 2. Upload Audio/Video Files

1. Navigate to the **Upload** page
2. Drag and drop a file or click to browse
3. Select the Whisper model (BASE, SMALL, MEDIUM)
4. Choose output format (JSON, SRT, VTT, TXT)
5. Click "Upload & Transcribe"

**Supported formats:**
- Audio: MP3, WAV, M4A, WEBM
- Video: MP4, MPEG
- Max file size: 500 MB

### 3. Monitor Transcriptions

- View all transcriptions in real-time
- Status updates automatically every 5 seconds for active jobs
- Download completed transcriptions
- View progress percentage for processing jobs

### 4. Manage API Keys

- Create new API keys with optional names
- View creation and last usage dates
- Delete unused keys
- Copy keys to clipboard

## API Client

The dashboard includes a comprehensive API client library:

```typescript
import { ApiClient } from './lib/api';

const client = new ApiClient('wtr_live_your_key_here');

// Upload and transcribe
const transcriptionId = await client.transcribe(file, 'BASE', 'JSON');

// Get status
const status = await client.getStatus(transcriptionId);

// List all transcriptions
const transcriptions = await client.listTranscriptions();

// Download result
const content = await client.downloadTranscription(transcriptionId);

// Manage API keys
const newKey = await client.createApiKey('My Key');
const keys = await client.listApiKeys();
await client.deleteApiKey(keyId);

// Get usage stats
const usage = await client.getUsage();
```

## Testing

### Run Tests

```bash
# Watch mode (development)
npm test

# CI mode with coverage
npm run test:ci
```

### Coverage Requirements

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### Test Files

- `__tests__/lib/api.test.ts` - API client tests
- `__tests__/components/UploadForm.test.tsx` - Upload form tests
- `__tests__/hooks/useApiKey.test.ts` - API key hook tests

## Building for Production

### Build the application:

```bash
npm run build
```

### Start production server:

```bash
npm start
```

### Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Environment Variables

### Required Variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | WhisperAPI backend URL | `http://localhost:3000/api/v1` |

### Optional Variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_DEFAULT_API_KEY` | Default API key for development only |

**Note:** All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Integration with Backend

The dashboard integrates with these backend endpoints:

- `POST /api/v1/transcribe` - Initiate transcription
- `GET /api/v1/status/:id` - Get transcription status
- `GET /api/v1/transcriptions` - List all transcriptions
- `GET /api/v1/download/:id` - Get download URL
- `GET /api/v1/usage` - Get usage statistics
- `POST /api/v1/keys` - Create API key
- `GET /api/v1/keys` - List API keys
- `DELETE /api/v1/keys/:id` - Delete API key

All requests include the API key in the `Authorization` header:
```
Authorization: Bearer wtr_live_xxxxxxxxxxxxx
```

## Error Handling

The dashboard handles these error scenarios:

- **Invalid API Key** - Prompts user to re-enter key
- **Rate Limit Exceeded** - Displays clear error message
- **File Too Large** - Shows size limit and current file size
- **Invalid File Type** - Lists supported formats
- **Upload Failed** - Provides retry option
- **Network Errors** - Graceful degradation

## Performance Optimizations

- Client-side state management for instant UI updates
- Auto-refresh only when active jobs exist
- Lazy loading of transcription results
- Optimized re-renders with React hooks
- Efficient polling (5-second intervals)

## Accessibility

- Semantic HTML elements
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- Color contrast compliance

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### "Failed to load transcriptions"
- Check that the backend API is running
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure API key is valid

### "Upload failed"
- Check file size (max 500 MB)
- Verify file format is supported
- Check network connection
- Ensure backend S3/R2 is configured

### "API key not working"
- Verify key starts with `wtr_live_`
- Create a new key in API Keys page
- Clear localStorage and re-enter key

## Contributing

This module is part of the WhisperAPI parallel build system. See `00_SHARED_CONTEXT.md` for integration details.

### Development Workflow:

1. Make changes
2. Run tests: `npm test`
3. Build: `npm run build`
4. Test production build locally

## License

Part of the WhisperAPI project.

## Support

For issues related to:
- **Dashboard UI/UX**: Check this README
- **API Integration**: See `lib/api.ts` documentation
- **Backend Issues**: Refer to backend documentation

## Next Steps

After completing the dashboard setup:

1. ✅ Configure backend API URL
2. ✅ Create an API key
3. ✅ Upload a test file
4. ✅ Verify transcription works end-to-end
5. ✅ Deploy to Vercel (see Task 13)

## Integration Notes

### For Task 8 (API Routes):
- Expects standard API response format (see `lib/types.ts`)
- Requires CORS headers for local development
- Must return presigned S3 URLs for upload

### For Task 2 (S3 Service):
- Dashboard uploads directly to presigned URLs
- No file data passes through backend
- Supports large file uploads (up to 500 MB)

### For Task 5 (Job Queue):
- Dashboard polls `/status/:id` every 5 seconds
- Expects `progress` field (0-100)
- Handles all TranscriptionStatus values

### For Task 12 (Configuration):
- Reads `NEXT_PUBLIC_API_URL` from environment
- Falls back to localhost:3000 for development
- Supports both local and cloud deployments

---

**Dashboard Ready!** 🎉

This dashboard is production-ready and fully integrated with the WhisperAPI backend system.

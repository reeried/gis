# Vercel Deployment Setup

## Important Notes

### File Upload Limitations

⚠️ **Vercel has a 4.5MB limit for serverless function request bodies.**

This means:
- Files larger than 4.5MB cannot be uploaded directly through the serverless functions
- The current implementation uses `/tmp` directory which is **ephemeral** (files are deleted after function execution)
- For production use with larger files, consider:
  1. **Vercel Blob Storage** - Recommended for persistent file storage
  2. **External storage** (AWS S3, Cloudinary, etc.)
  3. **Client-side direct upload** to storage using pre-signed URLs

### Current Implementation

The API routes have been converted to Vercel serverless functions:
- `api/files/upload.js` - File upload endpoint
- `api/files/index.js` - Get all files
- `api/files/[id].js` - Get/Delete file by ID
- `api/files/[id]/download.js` - Download file
- `api/files/[id]/visibility.js` - Update file visibility
- `api/files/upload-from-url.js` - Upload from URL

### Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

   Or connect your GitHub repository to Vercel for automatic deployments.

### Local Development

For local development with the Express server:
```bash
npm run dev:all
```

This runs both the Vite dev server and the Express backend.

For Vercel serverless functions locally:
```bash
vercel dev
```

### Upgrading to Vercel Blob Storage

To support larger files and persistent storage:

1. Install Vercel Blob:
   ```bash
   npm install @vercel/blob
   ```

2. Update the upload handler to use Blob Storage instead of `/tmp`

3. Update file paths and download handlers accordingly

See: https://vercel.com/docs/storage/vercel-blob


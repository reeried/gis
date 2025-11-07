# Complete Vercel Deployment Guide

## Quick Start - Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy your project**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time) or **Yes** (if redeploying)
   - Project name: **gis-viewer** (or your preferred name)
   - Directory: **./** (current directory)
   - Override settings? **No**

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub (Recommended for CI/CD)

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `./`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Environment Variables** (if needed):
   - Go to Project Settings → Environment Variables
   - Add any required variables

4. **Deploy**: Vercel will automatically deploy on every push to main branch

## Important Limitations

### ⚠️ Current Storage Limitations

Your current setup uses **ephemeral storage** (`/tmp` directory), which means:

1. **Files are NOT persistent**: Uploaded files are deleted after the serverless function completes
2. **4.5MB upload limit**: Vercel has a 4.5MB limit for serverless function request bodies
3. **Metadata is lost**: File metadata stored in `/tmp` is also ephemeral

### Solutions for Production

#### Option A: Use Vercel Blob Storage (Recommended)

Vercel Blob provides persistent, scalable file storage. See `UPGRADE_TO_BLOB_STORAGE.md` for implementation.

#### Option B: Use External Storage

- **AWS S3** with pre-signed URLs
- **Cloudinary** for media files
- **Google Cloud Storage**
- **Azure Blob Storage**

#### Option C: Client-Side Direct Upload

Upload files directly from the browser to your storage provider using pre-signed URLs.

## Local Development

### Test Serverless Functions Locally

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Run Vercel dev server (simulates production environment)
vercel dev
```

This will:
- Start a local server that mimics Vercel's serverless environment
- Run your API functions in `api/` directory
- Serve your frontend from `dist/` (run `npm run build` first)

### Development with Express Server

For local development with the full Express server:

```bash
npm run dev:all
```

This runs:
- Express server on `http://localhost:3001`
- Vite dev server on `http://localhost:5173`

## Project Structure

```
GIS2/
├── api/                    # Vercel serverless functions
│   └── files/
│       ├── upload.js       # File upload endpoint
│       ├── index.js        # List all files
│       ├── [id].js         # Get/Delete file by ID
│       ├── [id]/
│       │   ├── download.js # Download file
│       │   └── visibility.js # Update visibility
│       └── upload-from-url.js # Upload from URL
├── server/                 # Express server (for local dev only)
│   └── index.js
├── src/                    # React frontend
├── vercel.json             # Vercel configuration
└── package.json
```

## Vercel Configuration

Your `vercel.json` is configured with:
- **Output Directory**: `dist` (Vite build output)
- **Function Timeouts**: 60 seconds for upload functions

## API Endpoints

Once deployed, your API will be available at:
- `https://your-project.vercel.app/api/files/upload`
- `https://your-project.vercel.app/api/files`
- `https://your-project.vercel.app/api/files/[id]`
- `https://your-project.vercel.app/api/files/[id]/download`
- `https://your-project.vercel.app/api/files/[id]/visibility`
- `https://your-project.vercel.app/api/files/upload-from-url`

## Troubleshooting

### Files Not Persisting

**Problem**: Uploaded files disappear after a few minutes.

**Solution**: This is expected with `/tmp` storage. Upgrade to Vercel Blob Storage or external storage.

### Upload Fails with Large Files

**Problem**: Files larger than 4.5MB fail to upload.

**Solution**: 
- Use Vercel Blob Storage (supports up to 4.5GB)
- Or implement client-side direct upload to external storage

### CORS Errors

**Problem**: CORS errors when accessing API from frontend.

**Solution**: The serverless functions already include CORS headers. If issues persist, check:
- Frontend URL matches allowed origins
- API base URL is correctly configured

### Function Timeout

**Problem**: Upload times out for large files.

**Solution**: Increase timeout in `vercel.json`:
```json
{
  "functions": {
    "api/files/upload.js": {
      "maxDuration": 300
    }
  }
}
```
Note: Maximum is 300 seconds (5 minutes) on Pro plan, 10 seconds on Hobby plan.

## Next Steps

1. **Deploy to Vercel** using the steps above
2. **Test your deployment** by uploading a small file
3. **Upgrade to persistent storage** for production use (see `UPGRADE_TO_BLOB_STORAGE.md`)
4. **Configure custom domain** (optional) in Vercel project settings

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Serverless Functions](https://vercel.com/docs/functions)


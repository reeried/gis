# Quick Deploy to Vercel

## Prerequisites
- Node.js installed
- Vercel account (free tier works)

## Step-by-Step Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

Answer the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No (first time)
- **Project name?** → `gis-viewer` (or press Enter)
- **Directory?** → `./` (press Enter)
- **Override settings?** → No

### 4. Deploy to Production
```bash
vercel --prod
```

## Your App Will Be Live At:
`https://gis-viewer.vercel.app` (or your project name)

## Update Frontend API URL

After deployment, update your frontend to use the Vercel API:

1. Check your deployment URL (e.g., `https://gis-viewer.vercel.app`)
2. Update `src/services/fileStorage.js`:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
   ```
3. Set environment variable in Vercel:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-project.vercel.app/api`
   - Redeploy

Or keep using `/api` (relative URL) - it will work automatically on Vercel.

## Test Your Deployment

1. Visit your deployed URL
2. Try uploading a small KML file (< 4.5MB)
3. Check the browser console for any errors

## Important Notes

⚠️ **Files won't persist** - Current setup uses temporary storage. Files are deleted after function execution.

For production with persistent storage, see `VERCEL_DEPLOYMENT_GUIDE.md` section on upgrading to Vercel Blob Storage.

## Troubleshooting

**Build fails?**
- Check that all dependencies are in `package.json`
- Run `npm install` locally to verify

**API not working?**
- Check Vercel function logs in dashboard
- Verify API routes are in `api/` directory
- Check CORS headers in serverless functions

**Files not uploading?**
- Check file size (must be < 4.5MB with current setup)
- Check browser console for errors
- Verify API endpoint is correct


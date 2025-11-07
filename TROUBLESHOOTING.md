# Troubleshooting Guide

## Common Issues and Solutions

### "Unexpected end of form" Error

This error occurs when busboy (multipart parser) receives incomplete or malformed form data.

**Causes:**
1. Request stream is terminated prematurely
2. File upload is interrupted
3. Network issues during upload
4. Request body is corrupted

**Solutions:**

1. **Check file size**: Ensure files are under 4.5MB (Vercel limit) or 200MB (current limit)
2. **Check network**: Ensure stable internet connection
3. **Check browser console**: Look for any errors before the upload completes
4. **Try smaller file**: Test with a small KML file first
5. **Check Content-Type**: Ensure the request is sent as `multipart/form-data` (browser should set this automatically)

**If using `vercel dev` locally:**
- Make sure you're using the latest version: `npm install -g vercel@latest`
- Try restarting the dev server
- Check that the request is reaching the function (check logs)

**If using Express server locally:**
- The Express server uses multer, not busboy
- Make sure you're running `npm run dev:all` or `npm run dev:server`
- Check that the server is running on port 3001

### File Upload Not Working

**Check:**
1. Browser console for errors
2. Network tab to see the request/response
3. Server logs for errors
4. File size (must be < 4.5MB for Vercel, < 200MB for current setup)

### Files Not Persisting

**Current limitation**: Files stored in `/tmp` are ephemeral and will be deleted after function execution.

**Solutions:**
1. For testing: Files will work during the same request/function execution
2. For production: Upgrade to Vercel Blob Storage or external storage (see VERCEL_DEPLOYMENT_GUIDE.md)

### CORS Errors

If you see CORS errors:
1. Check that CORS headers are set in the API functions
2. Ensure the frontend is making requests to the correct API URL
3. For local development, ensure Vite proxy is configured (if using Express server)

### API Not Found (404)

**Check:**
1. API routes are in the `api/` directory
2. File names match the route (e.g., `api/files/upload.js` → `/api/files/upload`)
3. Vercel configuration is correct in `vercel.json`
4. You're using the correct base URL in the frontend

### Build Errors

**Check:**
1. All dependencies are installed: `npm install`
2. Node version is compatible (Node 18+)
3. No syntax errors in API functions
4. Check build logs in Vercel dashboard

## Testing Locally

### With Express Server (Recommended for Development)
```bash
npm run dev:all
```
This runs both the frontend (Vite) and backend (Express) servers.

### With Vercel Dev (Testing Serverless Functions)
```bash
vercel dev
```
This simulates the Vercel environment locally.

## Getting Help

1. Check browser console for client-side errors
2. Check server logs for server-side errors
3. Check Network tab in browser DevTools to see request/response details
4. Enable verbose logging by checking console output

## Debug Mode

To enable more verbose logging, check the console output in:
- Browser DevTools (F12) → Console tab
- Terminal where server is running
- Vercel function logs (in Vercel dashboard)


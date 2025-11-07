# Hostinger Production Fix Guide

## Issues Fixed

### 1. ✅ API URL Configuration
**Problem:** `FileUpload.jsx` had hardcoded `http://localhost:3001/api` which doesn't work in production.

**Fix:** Changed to use relative URL `/api` (same as `fileStorage.js`)

### 2. ✅ Server Host Configuration
**Problem:** Server was only listening on default interface, which might not work on Hostinger.

**Fix:** Server now listens on `0.0.0.0` to accept connections from any network interface.

### 3. ✅ 403 Forbidden Error on /api/files/
**Problem:** Getting 403 Forbidden error when accessing `/api/files/` (with trailing slash). This was caused by web server (Apache/nginx) blocking directory access before the request reached Node.js.

**Fix:** 
- Added explicit route handler for `/api/files/` (with trailing slash) in `server/index.js`
- Created `.htaccess` file to allow API routes to pass through to Node.js
- Improved error handling in `fileStorage.js` to provide better error messages

## Deployment Checklist for Hostinger

### Step 1: Rebuild the Application

On your local machine:
```bash
npm run build
```

This creates the `dist/` folder with the updated frontend code.

### Step 2: Upload Updated Files

Upload these updated files to Hostinger:
- `src/components/FileUpload.jsx` (fixed API URL)
- `server/index.js` (fixed host binding, added trailing slash route)
- `src/services/fileStorage.js` (improved error handling)
- `.htaccess` (allows API routes to pass through)
- `dist/` folder (rebuild with `npm run build`)

### Step 3: Verify Server Configuration

In Hostinger control panel, ensure:

1. **Node.js Version**: Node.js 18.x or 20.x
2. **Start Command**: 
   ```bash
   npm start
   ```
   Or if that doesn't work on Hostinger:
   ```bash
   NODE_ENV=production node server/index.js
   ```

3. **Environment Variables** (if available):
   - `NODE_ENV=production`
   - `PORT=3001` (or the port Hostinger assigns)
   - `HOST=0.0.0.0` (optional, defaults to 0.0.0.0 now)

### Step 4: Restart the Application

After uploading files, restart your Node.js application in Hostinger control panel.

### Step 5: Test the Application

1. **Test Health Endpoint:**
   Visit: `https://gis.reeried.my.id/api/health`
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test File Upload:**
   - Open `https://gis.reeried.my.id/`
   - Try uploading a KML file
   - Check browser console (F12) for any errors
   - Check Network tab to see if API calls are working

## Common Issues and Solutions

### Issue: "Cannot connect to server"

**Check:**
1. Is the server running? Check Hostinger logs
2. Is the port correct? Check Hostinger Node.js settings
3. Are API calls using relative URLs? Check browser console

**Solution:**
- Verify server is running in Hostinger control panel
- Check server logs for errors
- Ensure `dist/` folder is uploaded and contains built files

### Issue: CORS Errors

**Solution:**
The server already has CORS enabled. If you still see CORS errors:
- Ensure you're accessing the site via HTTPS (https://gis.reeried.my.id/)
- Check that API calls use relative URLs (`/api/...` not `http://...`)

### Issue: 404 Errors for API Routes

**Check:**
1. Server logs - are routes being registered?
2. Is the server running in production mode?
3. Are API routes defined before the SPA fallback route?

**Solution:**
- Verify `NODE_ENV=production` is set
- Check server logs for route registration
- Ensure `server/index.js` is the correct version

### Issue: 403 Forbidden Error on /api/files/

**Symptoms:**
- Browser console shows: `GET https://gis.reeried.my.id/api/files/ 403 Forbidden`
- Error message: "Failed to fetch files"

**Check:**
1. Is the Node.js server running? Check Hostinger logs
2. Is `.htaccess` file uploaded to the root directory?
3. Does Hostinger use Apache or nginx? (Apache uses .htaccess, nginx needs different config)

**Solution:**
- Ensure `.htaccess` file is in the root directory (same level as `server/` and `dist/`)
- Verify Node.js server is running and accessible
- Check server logs for any errors
- If using nginx, you may need to configure nginx to proxy `/api/*` requests to Node.js
- The route now handles both `/api/files` and `/api/files/` (with trailing slash)

### Issue: File Upload Not Working

**Check:**
1. Browser console for errors
2. Network tab - is the request being sent?
3. Server logs - is the request reaching the server?

**Solution:**
- Check file size (must be under 500MB)
- Check file format (only .kml and .kmz)
- Verify `uploads/` directory exists and is writable
- Check server logs for multer errors

## Testing Locally Before Deploying

Test production build locally:

**Windows (PowerShell):**
```powershell
npm run build
$env:NODE_ENV="production"; node server/index.js
```

**Linux/Mac:**
```bash
npm run build
npm start
```

Then visit `http://localhost:3001` and test file uploads.

## Debugging on Hostinger

### Check Server Logs

In Hostinger control panel, check:
- Application logs
- Error logs
- Access logs

Look for:
- Server startup messages
- Route registration
- File upload requests
- Error messages

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for:
   - API URL logs (should show relative URLs)
   - Error messages
   - Network errors

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try uploading a file
4. Check:
   - Request URL (should be `https://gis.reeried.my.id/api/files/upload`)
   - Status code (200 = success)
   - Response (should be JSON)

## Quick Verification Commands

After deployment, test these endpoints:

1. **Health Check:**
   ```
   https://gis.reeried.my.id/api/health
   ```

2. **List Files:**
   ```
   https://gis.reeried.my.id/api/files
   ```

Both should return JSON responses if the server is working correctly.

## Files Changed

- ✅ `src/components/FileUpload.jsx` - Fixed API URL
- ✅ `server/index.js` - Fixed host binding, added trailing slash route handler
- ✅ `src/services/fileStorage.js` - Improved error handling for 403 errors
- ✅ `.htaccess` - Created to allow API routes to pass through to Node.js

## Next Steps

1. Rebuild: `npm run build`
2. Upload updated files to Hostinger
3. Restart the application
4. Test the health endpoint
5. Test file upload functionality
6. Check browser console for any remaining errors


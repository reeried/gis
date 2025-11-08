# Fix for "Cannot connect to server" Upload Error

## Problem
When trying to upload files on your hosting (gis.reeried.my.id), you're getting:
```
Error: Cannot connect to server at https://gis.reeried.my.id/api/files/upload
Please make sure the backend server is running.
```

## Root Causes

This error typically occurs when:
1. **Node.js server is not running** - The most common cause
2. **Apache is not proxying requests** - API requests aren't reaching Node.js
3. **Wrong port configuration** - Server is running on a different port
4. **Apache blocking requests** - `.htaccess` not configured correctly

## Solution Steps

### Step 1: Verify Node.js Server is Running

1. **Check Hostinger Control Panel**:
   - Go to your Hostinger control panel
   - Navigate to "Node.js" or "Applications" section
   - Verify your application status shows "Running" or "Active"
   - If it shows "Stopped", click "Start" or "Restart"

2. **Check Server Logs**:
   - In Hostinger control panel, check the application logs
   - Look for errors or startup messages
   - The server should log: `Server running on http://0.0.0.0:PORT`

3. **Test API Health Endpoint**:
   - Visit: `https://gis.reeried.my.id/api/health`
   - If you see `{"status":"ok","timestamp":"..."}`, the server is running
   - If you get an error or timeout, the server is not running

### Step 2: Check Port Configuration

1. **In Hostinger Control Panel**:
   - Check what port is assigned to your Node.js application
   - It might be different from 3001 (could be 3000, 8080, or another port)

2. **Update `.htaccess` if needed**:
   - If your server is running on a different port, update the `.htaccess` file
   - Change `3001` to your actual port in the ProxyPass lines:
   ```apache
   ProxyPass /api http://localhost:YOUR_ACTUAL_PORT/api
   ProxyPassReverse /api http://localhost:YOUR_ACTUAL_PORT/api
   ```

### Step 3: Verify Apache Proxy Configuration

The updated `.htaccess` file should proxy API requests to Node.js. However, if `mod_proxy` is not available on your Hostinger account, try the alternative configuration below.

### Step 4: Alternative Configuration (If mod_proxy not available)

If the proxy configuration doesn't work, Hostinger might be using a different setup. In that case:

1. **Check if Node.js serves directly**:
   - Some Hostinger setups serve Node.js directly without Apache
   - In this case, the `.htaccess` file might not be used
   - The server should handle all requests directly

2. **Verify server configuration**:
   - Ensure `server/index.js` is configured to serve both API and frontend
   - The server should listen on `0.0.0.0` (already configured ✅)

## Quick Fixes

### Fix 1: Restart the Node.js Application

1. Go to Hostinger control panel
2. Find your Node.js application
3. Click "Restart" or "Stop" then "Start"

### Fix 2: Check Environment Variables

Ensure these are set in Hostinger:
- `NODE_ENV=production`
- `PORT=3001` (or the port Hostinger assigned)
- `HOST=0.0.0.0` (optional, default is already 0.0.0.0)

### Fix 3: Verify Start Command

In Hostinger, the start command should be:
```bash
npm start
```

Which runs: `NODE_ENV=production node server/index.js`

### Fix 4: Check File Permissions

Via SSH or FTP:
```bash
chmod 755 uploads
chmod 755 dist
```

## Testing After Fix

1. **Test Health Endpoint**:
   ```
   https://gis.reeried.my.id/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test File Upload**:
   - Try uploading a small KML file (< 1MB)
   - Check browser console for any errors
   - Check server logs for upload attempts

3. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try uploading a file
   - Check if the request to `/api/files/upload` shows:
     - Status 200 (success) ✅
     - Status 500 (server error) - check server logs
     - Failed/Network error - server not running or not accessible

## Common Issues and Solutions

### Issue: "502 Bad Gateway"
**Solution**: Node.js server is not running. Start it in Hostinger control panel.

### Issue: "503 Service Unavailable"
**Solution**: Server is starting up. Wait a few seconds and try again.

### Issue: "404 Not Found"
**Solution**: API route not found. Check that server is running and routes are configured.

### Issue: "Connection Refused"
**Solution**: Server is not listening on the correct port or host. Check PORT and HOST environment variables.

### Issue: "Timeout"
**Solution**: Server might be overloaded or not responding. Check server logs and restart if needed.

## Still Not Working?

1. **Check Server Logs** in Hostinger control panel for specific errors
2. **Verify Node.js Version** is 18.x or 20.x
3. **Check Dependencies** are installed: `npm install --production`
4. **Verify Build** exists: `dist/` folder should contain built frontend files
5. **Contact Hostinger Support** if the issue persists

## Updated Files

The following files have been updated to fix the upload error:

1. **`.htaccess`** - Added Apache proxy configuration to forward API requests to Node.js
2. **`server/index.js`** - Already configured correctly (listens on 0.0.0.0)

## Next Steps

1. Upload the updated `.htaccess` file to your Hostinger hosting
2. Restart your Node.js application in Hostinger control panel
3. Test the `/api/health` endpoint
4. Try uploading a file again


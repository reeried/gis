# cPanel Deployment Troubleshooting

## Issue: Blank White Page at `reeried.my.id/gissapp`

### Possible Causes:

1. **App not running** - Node.js app might not be started
2. **Wrong application root path** - cPanel can't find your files
3. **Missing dist folder** - Frontend not built
4. **Subdirectory path issue** - App needs base path configuration
5. **Port/URL mismatch** - App running on wrong port or URL

## Quick Checks

### 1. Check if App is Running

In cPanel Node.js interface:
- Find your app (`gissapp`)
- Check if status shows **"Running"** (green/ON)
- If not, click **"START APP"**

### 2. Check Application Logs

In cPanel Node.js interface:
- Click **"View Logs"** for your app
- Look for errors like:
  - "Cannot find module"
  - "Port already in use"
  - "EADDRINUSE"
  - "dist folder not found"

### 3. Verify Application Root Path

In cPanel Node.js interface, check:
- **Application root** should be: `/home/reeg2836/nodejs/gissapp`
- **Startup file** should be: `server/index.js`
- Make sure these match your actual file structure

### 4. Check if dist folder exists

Via cPanel File Manager:
- Navigate to `/home/reeg2836/nodejs/gissapp`
- Verify `dist` folder exists
- Check if `dist/index.html` exists
- If missing, you need to build the frontend

## Solutions

### Solution 1: Fix Application URL (Recommended)

If your app should be at the root domain:

1. In cPanel Node.js interface
2. Edit your application
3. Change **Application URL** from `reeried.my.id/gissapp` to `reeried.my.id` (root)
4. Save and restart the app

### Solution 2: Configure for Subdirectory

If you need to keep `/gissapp` subdirectory:

1. **Update vite.config.js** to include base path:
   ```javascript
   export default defineConfig({
     base: '/gissapp/',
     // ... rest of config
   })
   ```

2. **Rebuild frontend:**
   ```bash
   npm run build
   ```

3. **Upload new dist folder** to cPanel

4. **Restart app** in cPanel

### Solution 3: Verify File Structure

Your app structure should be:
```
/home/reeg2836/nodejs/gissapp/
├── server/
│   └── index.js
├── dist/
│   ├── index.html
│   └── assets/
├── package.json
├── package-lock.json
└── ... other files
```

### Solution 4: Check Node.js Version

1. In cPanel Node.js interface
2. Verify Node.js version is **18.x or 20.x** (not 10.x)
3. If wrong, recreate app with correct version

### Solution 5: Reinstall Dependencies

1. In cPanel Node.js interface
2. Click **"Run NPM Install"** for your app
3. Wait for completion
4. Restart app

## Common Error Messages

### "Cannot find module 'express'"
- **Fix:** Click "Run NPM Install" in cPanel

### "dist folder not found"
- **Fix:** Build frontend with `npm run build` and upload `dist` folder

### "Port already in use"
- **Fix:** Stop other Node.js apps or contact hosting support

### "EADDRINUSE"
- **Fix:** cPanel manages ports automatically, but if this persists, restart the app

### Blank white page
- **Check:** Browser console (F12) for JavaScript errors
- **Check:** Network tab for failed asset loads (404 errors)
- **Check:** Application logs in cPanel

## Debugging Steps

1. **Open browser console (F12)**
   - Look for red error messages
   - Check Network tab for failed requests

2. **Check server logs**
   - In cPanel → Node.js → View Logs
   - Look for startup errors

3. **Test API directly**
   - Visit: `https://reeried.my.id/gissapp/api/health`
   - Should return JSON response
   - If 404, app might not be running or URL is wrong

4. **Verify environment variables**
   - In cPanel Node.js interface
   - Check all required variables are set:
     - `NODE_ENV=production`
     - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## Next Steps

After checking the above:
1. If app is not running → Start it
2. If dist folder missing → Build and upload
3. If wrong URL → Fix Application URL in cPanel
4. If subdirectory needed → Configure base path (Solution 2)

If still not working, check the application logs and share the error messages.


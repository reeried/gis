# Fix for Subdirectory Deployment (`/gissapp`)

If your app is deployed at `reeried.my.id/gissapp` and showing a blank page, you need to configure the base path.

## Option 1: Change to Root Domain (Recommended)

**Easiest solution:** Configure your Node.js app to run at the root domain instead of subdirectory.

1. In cPanel → Node.js interface
2. Edit your application (`gissapp`)
3. Change **Application URL** from `reeried.my.id/gissapp` to `reeried.my.id`
4. Save and restart the app

This way, you don't need to rebuild or change any code.

## Option 2: Configure for Subdirectory

If you must keep `/gissapp` subdirectory:

### Step 1: Set Environment Variable

Before building, set the base path:

**On Windows (PowerShell):**
```powershell
$env:VITE_BASE_PATH="/gissapp/"
npm run build
```

**On Linux/Mac:**
```bash
export VITE_BASE_PATH=/gissapp/
npm run build
```

**Or create/update `.env.production`:**
```
VITE_BASE_PATH=/gissapp/
```

### Step 2: Rebuild Frontend

```bash
npm run build
```

### Step 3: Upload New dist Folder

Upload the newly built `dist` folder to cPanel, replacing the old one.

### Step 4: Restart App

In cPanel Node.js interface, restart your application.

## Option 3: Quick Test - Check if App is Running

Before doing anything else, verify:

1. **Is the app running?**
   - cPanel → Node.js → Check if `gissapp` shows "Running"
   - If not, click "START APP"

2. **Check logs:**
   - cPanel → Node.js → "View Logs"
   - Look for errors

3. **Test API:**
   - Visit: `https://reeried.my.id/gissapp/api/health`
   - If this works, the server is running
   - If 404, the app might not be configured correctly

4. **Check browser console:**
   - Press F12 → Console tab
   - Look for errors like "Failed to load resource"

## Most Likely Issue

Based on your setup, the most common issue is:

**The Application URL in cPanel is set to `/gissapp` but it should be at the root domain.**

cPanel Node.js apps typically run on their own port and are accessed directly via the domain, not as a subdirectory. The subdirectory might be causing routing issues.

**Quick Fix:**
1. In cPanel Node.js, edit your app
2. Change Application URL to `reeried.my.id` (remove `/gissapp`)
3. Save and restart

If you need the app at `/gissapp` for some reason, use Option 2 above.


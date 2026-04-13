# Fix: API Connection Error - Wrong URL

## The Problem

Your app is trying to connect to:
- ❌ `https://gis-app.reeried.my.id/api/health` (subdomain that doesn't exist)

But your app is deployed at:
- ✅ `https://reeried.my.id` (root domain)

## Root Cause

The frontend was built with `VITE_API_URL` environment variable set to the wrong URL. Since your frontend and backend are served from the same domain in cPanel, you should use **relative URLs** (`/api`) instead of absolute URLs.

## Solution: Rebuild Frontend Without VITE_API_URL

### Step 1: Check for .env Files

**On your local machine**, check if you have `.env` or `.env.production` files with:

```bash
# Check if VITE_API_URL is set
cat .env
cat .env.production
```

If you see:
```
VITE_API_URL=https://gis-app.reeried.my.id/api
```

**This is the problem!**

### Step 2: Remove or Update VITE_API_URL

**Option A: Remove VITE_API_URL (Recommended for cPanel)**

Since frontend and backend are on the same domain, use relative URLs:

1. **Edit `.env` or `.env.production`:**
   - Remove the line: `VITE_API_URL=...`
   - Or comment it out: `# VITE_API_URL=...`

2. **Or create `.env.production` with:**
   ```
   # Use relative URLs for same-domain deployment
   # VITE_API_URL is not set, so it will use '/api'
   ```

**Option B: Set to Correct URL (if needed)**

If you must use absolute URL, set it to your actual domain:

```
VITE_API_URL=https://reeried.my.id/api
```

But **Option A is better** for same-domain deployment.

### Step 3: Rebuild Frontend

**On your local machine:**

```bash
# Make sure VITE_API_URL is not set (or removed from .env)
npm run build
```

This will create a new `dist/` folder with relative URLs.

### Step 4: Upload New dist Folder

1. **Via FTP or cPanel File Manager:**
   - Navigate to `/home/reeg2836/nodejs/`
   - **Delete the old `dist/` folder** (or rename to `dist_backup`)
   - **Upload the new `dist/` folder** from your local machine

2. **Or via SSH:**
   ```bash
   # Backup old dist
   mv dist dist_backup
   
   # Upload new dist folder (via FTP/SFTP)
   ```

### Step 5: Restart Node.js App

1. **cPanel → Node.js**
2. **Restart your application**
3. **Clear browser cache** (Ctrl+Shift+Delete)
4. **Test again** at `https://reeried.my.id`

## Quick Fix (If You Can't Rebuild)

If you can't rebuild right now, you can temporarily fix it by setting an environment variable in cPanel:

1. **cPanel → Node.js → Edit your app**
2. **Add environment variable:**
   - Name: `VITE_API_URL`
   - Value: `https://reeried.my.id/api`
3. **Save and restart**

**Note:** This won't work because Vite environment variables are embedded at build time, not runtime. You **must rebuild** the frontend.

## Verification

After rebuilding and uploading:

1. **Open browser console (F12)**
2. **Check Network tab:**
   - API calls should go to: `https://reeried.my.id/api/...` ✅
   - NOT: `https://gis-app.reeried.my.id/api/...` ❌

3. **Test the app:**
   - Visit `https://reeried.my.id`
   - Should load without connection errors
   - API calls should work

## Why This Happens

- **Vite embeds environment variables at build time** into the JavaScript bundle
- If `VITE_API_URL` was set during build, it's hardcoded in the `dist/` files
- Changing environment variables in cPanel won't help - you must rebuild
- For same-domain deployment, **don't set VITE_API_URL** - use relative URLs

## Best Practice for cPanel

**For cPanel Node.js apps (same domain):**
- ✅ **Don't set `VITE_API_URL`** - use relative URLs (`/api`)
- ✅ Frontend and backend are on same domain
- ✅ Relative URLs work automatically

**Only set `VITE_API_URL` if:**
- Frontend and backend are on different domains
- Using a CDN or separate hosting
- Need cross-origin API calls

## Summary

1. ✅ Remove `VITE_API_URL` from `.env` files
2. ✅ Run `npm run build` locally
3. ✅ Upload new `dist/` folder to cPanel
4. ✅ Restart Node.js app
5. ✅ Clear browser cache and test

The key is: **Rebuild the frontend without VITE_API_URL set**, so it uses relative URLs that work with your same-domain deployment.


# Fix: Connection Timeout - API Not Responding

## The Problem

✅ **Good news:** The URL is now correct (`https://reeried.my.id/api/health`)  
❌ **Bad news:** Connection timeout - the Node.js server is not responding

## Possible Causes

1. **Node.js app is not running**
2. **Server crashed or errored on startup**
3. **Port/firewall issue**
4. **API route not configured correctly**

## Step-by-Step Troubleshooting

### Step 1: Check if Node.js App is Running

1. **Go to cPanel → Node.js**
2. **Find your application** (`gissapp`)
3. **Check the status:**
   - ✅ **"Running"** (green/ON) → Continue to Step 2
   - ❌ **"Stopped"** (red/OFF) → Click **"START APP"** and check logs

### Step 2: Check Application Logs

1. **In cPanel → Node.js → "View Logs"**
2. **Look for:**
   - ✅ **"Server running on http://0.0.0.0:PORT"** → Server is running
   - ✅ **"Serving static files from: /home/reeg2836/nodejs/dist"** → Config is correct
   - ❌ **"Error: Cannot find module"** → Dependencies issue
   - ❌ **"EADDRINUSE"** → Port conflict
   - ❌ **"Database connection failed"** → DB config issue (but server should still start)
   - ❌ **No logs or empty** → App might not be starting

**Share the logs** - they'll tell us what's wrong!

### Step 3: Test API Directly

**Try accessing the API endpoint directly in your browser:**

1. **Visit:** `https://reeried.my.id/api/health`
2. **Expected:** JSON response like `{"status":"ok"}` or similar
3. **If 404:** API route not found
4. **If timeout:** Server not responding
5. **If HTML/PHP:** Apache is serving instead of Node.js

### Step 4: Check Server Startup

**Common startup errors:**

1. **"Cannot find module 'express'"**
   - **Fix:** Click "Run NPM Install" in cPanel Node.js interface

2. **"SyntaxError: Cannot use import statement"**
   - **Fix:** Node.js version is too old (should be 18+)

3. **"EADDRINUSE: address already in use"**
   - **Fix:** Another app is using the port, restart the app

4. **Database connection errors**
   - **Note:** Server should still start even if DB fails
   - **Check:** Environment variables (DB_HOST, DB_USER, etc.)

### Step 5: Verify Environment Variables

**In cPanel → Node.js → Edit your app:**

Check these environment variables are set:
- `NODE_ENV=production`
- `DB_HOST=localhost` (or your MySQL host)
- `DB_USER=your_username`
- `DB_PASSWORD=your_password`
- `DB_NAME=your_database`

**Missing variables won't prevent startup, but check anyway.**

### Step 6: Restart the Application

1. **cPanel → Node.js**
2. **Stop the app** (if running)
3. **Wait 5 seconds**
4. **Start the app**
5. **Check logs immediately**

## Quick Fixes

### Fix 1: Restart the App

1. **cPanel → Node.js**
2. **Click "RESTART APP"** or toggle OFF then ON
3. **Wait 30 seconds**
4. **Check logs**
5. **Test again**

### Fix 2: Reinstall Dependencies

1. **cPanel → Node.js**
2. **Click "Run NPM Install"**
3. **Wait for completion**
4. **Restart the app**

### Fix 3: Check File Permissions

**Via cPanel File Manager:**

1. Navigate to `/home/reeg2836/nodejs/`
2. **Check permissions:**
   - `server/index.js` should be readable (644 or 755)
   - `package.json` should be readable (644)
   - `dist/` folder should be readable (755)

### Fix 4: Verify Startup File

**In cPanel → Node.js → Edit:**

- **Application startup file:** Should be `server/index.js`
- **Application root:** Should be `/home/reeg2836/nodejs` (full path)

## Most Common Issues

### Issue 1: App Not Running
- **Symptom:** Status shows "Stopped"
- **Fix:** Click "START APP" in cPanel

### Issue 2: Dependencies Missing
- **Symptom:** Logs show "Cannot find module"
- **Fix:** Click "Run NPM Install" in cPanel

### Issue 3: Server Crashed
- **Symptom:** App was running but stopped
- **Fix:** Check logs for errors, restart app

### Issue 4: Port Conflict
- **Symptom:** Logs show "EADDRINUSE"
- **Fix:** Restart app, or contact hosting support

## Debug Checklist

- [ ] Node.js app status is "Running"?
- [ ] Application logs show "Server running on..."?
- [ ] Can access `https://reeried.my.id/api/health` directly?
- [ ] Dependencies installed ("Run NPM Install" clicked)?
- [ ] Environment variables set correctly?
- [ ] Startup file is `server/index.js`?
- [ ] Application root is `/home/reeg2836/nodejs`?

## What to Share

If still not working, share:

1. **Application status** (Running/Stopped)
2. **Application logs** (last 20-30 lines)
3. **What happens when you visit** `https://reeried.my.id/api/health` directly
4. **Any error messages** from the logs

## Expected Log Output

When working correctly, logs should show:

```
Initializing database...
✅ Database connection successful
Server running on http://0.0.0.0:PORT
Environment: production
Uploads directory: /home/reeg2836/nodejs/uploads
Max file size: 500MB
Production mode: Serving built frontend from dist/
Serving static files from: /home/reeg2836/nodejs/dist
```

If you see errors instead, that's what we need to fix!


# Fix CloudLinux Passenger Configuration Issues

## Critical Issues Found

### Issue 1: Node.js Version is Too Old ⚠️ CRITICAL

**Current:** `PassengerNodejs "/home/reeg2836/nodevenv/nodejs/10/bin/node"`  
**Problem:** Node.js 10 doesn't support ES modules (`"type": "module"` in package.json)  
**Required:** Node.js 18.x or 20.x (LTS)

### Issue 2: Application Root Path

**Current:** `PassengerAppRoot "/home/reeg2836/nodejs"`  
**Check:** Are your files in `/home/reeg2836/nodejs/` or `/home/reeg2836/nodejs/gissapp/`?

## How to Fix

### Step 1: Change Node.js Version in cPanel

1. **Go to cPanel → Node.js**
2. **Find your application** (`gissapp`)
3. **Click "Edit" or the settings icon**
4. **Change Node.js version:**
   - Current: `10.24.1` or similar
   - Change to: `18.x` or `20.x` (LTS version)
5. **Save the changes**
6. **Restart the application**

**Important:** After changing the version, cPanel will:
- Update the Passenger configuration automatically
- Reinstall dependencies in the new Node.js version's virtual environment
- Update the `PassengerNodejs` path to point to the correct version

### Step 2: Verify Application Root Path

Based on your file structure, check where your files actually are:

**Option A: Files are in `/home/reeg2836/nodejs/` directly**
- `PassengerAppRoot "/home/reeg2836/nodejs"` ✅ (Correct)
- Your `package.json`, `server/`, `dist/` are directly in `nodejs/`

**Option B: Files are in `/home/reeg2836/nodejs/gissapp/`**
- `PassengerAppRoot "/home/reeg2836/nodejs/gissapp"` ✅ (Should be this)
- Your `package.json`, `server/`, `dist/` are inside `gissapp/` folder

**To check:**
1. In cPanel File Manager
2. Navigate to `/home/reeg2836/nodejs/`
3. Look for `package.json` and `server/index.js`
4. If they're directly in `nodejs/`, Option A is correct
5. If they're in `nodejs/gissapp/`, Option B is correct

### Step 3: Update Application Root in cPanel (if needed)

If your files are in `gissapp/` subfolder:

1. **Go to cPanel → Node.js**
2. **Edit your application**
3. **Change Application root:**
   - From: `nodejs/gissapp` (relative) or `/home/reeg2836/nodejs` (wrong)
   - To: `/home/reeg2836/nodejs/gissapp` (full absolute path)
4. **Save and restart**

## What Happens After Fixing

After you change the Node.js version in cPanel:

1. **cPanel will automatically update the Passenger config file**
2. **The `PassengerNodejs` path will change to:**
   - `/home/reeg2836/nodevenv/nodejs/18/bin/node` (for Node.js 18)
   - Or `/home/reeg2836/nodevenv/nodejs/20/bin/node` (for Node.js 20)

3. **You'll need to reinstall dependencies:**
   - In cPanel → Node.js
   - Click "Run NPM Install" for your app
   - This installs packages in the new Node.js version's virtual environment

4. **Restart the application**

## Verification

After making changes:

1. **Check application status:**
   - Should show "Running" (green)

2. **Check application logs:**
   - Should show: "Server running on http://0.0.0.0:PORT"
   - Should NOT show: "SyntaxError: Cannot use import statement outside a module"
   - Should show: "Serving static files from: /home/reeg2836/nodejs/dist"

3. **Test the app:**
   - Visit `https://reeried.my.id`
   - Should load your application (not blank page)

## Common Errors After Node.js Version Change

### "Cannot find module"
- **Fix:** Click "Run NPM Install" in cPanel Node.js interface

### "SyntaxError: Cannot use import statement"
- **Fix:** Node.js version is still too old, verify it's 18+ in cPanel

### "EADDRINUSE" or port errors
- **Fix:** Restart the application in cPanel

## Quick Checklist

- [ ] Node.js version changed to 18.x or 20.x in cPanel
- [ ] Application root path is correct (full absolute path)
- [ ] "Run NPM Install" executed after version change
- [ ] Application restarted
- [ ] Application status shows "Running"
- [ ] Logs show server is running without errors
- [ ] App loads at `https://reeried.my.id`

## Important Notes

- **Don't manually edit the Passenger config file** - cPanel manages it automatically
- **Always change Node.js version via cPanel interface**, not by editing files
- **After changing Node.js version, always run "NPM Install"** to reinstall dependencies
- **The Passenger config file is auto-generated** - your changes will be overwritten

## Next Steps

1. **Change Node.js version to 18.x or 20.x in cPanel** (most critical)
2. **Verify application root path is correct**
3. **Run "NPM Install"**
4. **Restart the app**
5. **Check logs for errors**
6. **Test the application**

The Node.js version issue is the most critical - fix that first!


# Debug: App Still Accessing public_html

## Your Setup (Confirmed)
- ✅ `package.json` is in `/home/reeg2836/nodejs/`
- ✅ `public_html/gissapp` does NOT exist
- ✅ Passenger config: `PassengerAppRoot "/home/reeg2836/nodejs"` (correct)

## Possible Causes

### 1. Default Files in public_html Root

Apache serves `public_html/` by default. Check if there's an `index.html` or `index.php` in the root:

**Check:**
- `/home/reeg2836/public_html/index.html`
- `/home/reeg2836/public_html/index.php`

If these exist, Apache will serve them instead of proxying to Node.js.

**Fix:**
- Rename them (e.g., `index.html.backup`)
- Or delete them if not needed

### 2. .htaccess in public_html Root

An `.htaccess` file in `public_html/` might be blocking the proxy.

**Check:**
- `/home/reeg2836/public_html/.htaccess`

**Fix:**
- If it exists, check its contents
- It might need to proxy requests to Node.js
- Or rename it temporarily to test

### 3. Node.js App Not Running

The app might not be running, so Apache falls back to serving `public_html/`.

**Check:**
1. Go to **cPanel → Node.js**
2. Find your application
3. Check if status shows **"Running"** (green/ON)
4. If not, click **"START APP"**

### 4. Application URL Mismatch

The Application URL in cPanel might not match your domain.

**Check:**
1. Go to **cPanel → Node.js**
2. Check **Application URL**
3. Should be: `reeried.my.id` (root domain)
4. Should NOT be: `reeried.my.id/gissapp` or a subdomain

### 5. Conflicting Files in nodejs/gissapp

The `gissapp` folder with `.htaccess` and `index.php` might be interfering.

**Check:**
- `/home/reeg2836/nodejs/gissapp/.htaccess`
- `/home/reeg2836/nodejs/gissapp/index.php`

**Fix:**
- If these aren't needed, delete or rename them
- The `.htaccess` in `gissapp` might override Passenger settings

## Step-by-Step Debugging

### Step 1: Check Node.js App Status

1. **cPanel → Node.js**
2. **Is your app showing "Running"?**
   - If NO → Click "START APP"
   - If YES → Continue to Step 2

### Step 2: Check Application Logs

1. **cPanel → Node.js → "View Logs"**
2. **Look for:**
   - "Server running on http://0.0.0.0:PORT" ✅ (app is running)
   - "Cannot find module" ❌ (dependencies issue)
   - "EADDRINUSE" ❌ (port conflict)
   - No logs at all ❌ (app not starting)

### Step 3: Check public_html Root

**Via cPanel File Manager:**

1. Navigate to `/home/reeg2836/public_html/`
2. **Check for these files:**
   - `index.html` - If exists, rename it
   - `index.php` - If exists, rename it
   - `.htaccess` - Check its contents

3. **What to do:**
   - If `index.html` or `index.php` exist → Rename to `index.html.backup` or `index.php.backup`
   - If `.htaccess` exists → Check if it has Passenger config (it shouldn't be here)

### Step 4: Test Direct API Access

**Test if Node.js is responding:**

1. Visit: `https://reeried.my.id/api/health`
2. **Expected:** JSON response (proves Node.js is working)
3. **If 404:** Node.js app is not being reached
4. **If HTML/PHP:** Apache is serving from `public_html` instead

### Step 5: Check nodejs/gissapp Folder

**If the `gissapp` folder has conflicting files:**

1. Navigate to `/home/reeg2836/nodejs/gissapp/`
2. **Check for:**
   - `.htaccess` - Should NOT be here (Passenger config should be in `nodejs/`)
   - `index.php` - Should NOT be here (this is a Node.js app)
   - Other PHP files - Should NOT be here

3. **If these exist:**
   - Delete or rename them
   - They might be causing Apache to serve from this folder

### Step 6: Verify Passenger Config Location

**The `.htaccess` with Passenger config should be:**

- ✅ In `/home/reeg2836/nodejs/.htaccess` (same folder as `package.json`)
- ❌ NOT in `/home/reeg2836/nodejs/gissapp/.htaccess`

**Check:**
1. Navigate to `/home/reeg2836/nodejs/`
2. Look for `.htaccess` file
3. It should contain the Passenger configuration you showed earlier

## Most Likely Fixes

### Fix 1: Remove Default Files from public_html

```bash
# Via File Manager or SSH:
# Rename or delete:
public_html/index.html → index.html.backup
public_html/index.php → index.php.backup
```

### Fix 2: Remove Conflicting Files from nodejs/gissapp

```bash
# Via File Manager:
# Delete or rename:
nodejs/gissapp/index.php
nodejs/gissapp/.htaccess (if it's not the Passenger config)
```

### Fix 3: Ensure Node.js App is Running

1. **cPanel → Node.js**
2. **Start the app** if not running
3. **Check logs** for errors

### Fix 4: Verify Application URL

1. **cPanel → Node.js → Edit**
2. **Application URL** should be: `reeried.my.id` (root, not subdirectory)
3. **Save and restart**

## Quick Test

After making changes:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Visit:** `https://reeried.my.id`
3. **Should see:** Your Node.js app (not blank page or PHP content)
4. **Check browser console (F12):** Look for errors

## What to Check First

**Priority order:**
1. ✅ Is Node.js app "Running" in cPanel?
2. ✅ What's in `public_html/` root? (index.html, index.php)
3. ✅ What's in `nodejs/gissapp/`? (conflicting files)
4. ✅ Does `/home/reeg2836/nodejs/.htaccess` exist with Passenger config?
5. ✅ Test `https://reeried.my.id/api/health` - does it return JSON?

Let me know what you find, and I'll help you fix it!


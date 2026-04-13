# Fix: App Accessing public_html Instead of nodejs Folder

## Why This Happens

In cPanel, there are two separate systems:

1. **Apache/Public HTML** - Serves files from `public_html/` (traditional web hosting)
2. **Node.js App** - Runs on a separate port and serves from `nodejs/` folder

When you visit `reeried.my.id`, Apache checks `public_html/` first. If it finds files there, it serves them instead of forwarding to your Node.js app.

## The Problem

Your Node.js app is in `/home/reeg2836/nodejs/gissapp`, but:
- Apache is serving from `/home/reeg2836/public_html/gissapp` (if it exists)
- Requests are hitting Apache before reaching your Node.js app
- The Node.js app runs on its own port, but requests aren't being proxied correctly

## Solutions

### Solution 1: Remove/Empty public_html/gissapp (Recommended)

If you have a `gissapp` folder in `public_html`, it's conflicting:

1. **Via cPanel File Manager:**
   - Navigate to `/home/reeg2836/public_html/`
   - If `gissapp` folder exists, either:
     - **Delete it** (if not needed)
     - **Rename it** to `gissapp_backup` (to keep as backup)

2. **Why this works:**
   - When `public_html/gissapp` doesn't exist, Apache won't serve from there
   - cPanel will route requests to your Node.js app instead

### Solution 2: Configure .htaccess in public_html

If you need to keep files in `public_html`, create/update `.htaccess` in `public_html/`:

```apache
# Redirect all requests to Node.js app
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api
RewriteRule ^(.*)$ http://localhost:PORT/$1 [P,L]

# Proxy API requests to Node.js
ProxyPass /api http://localhost:PORT/api
ProxyPassReverse /api http://localhost:PORT/api
```

**⚠️ Note:** Replace `PORT` with the actual port cPanel assigned to your Node.js app (check in cPanel Node.js interface).

### Solution 3: Verify Node.js App Configuration

Make sure your Node.js app is configured correctly:

1. **In cPanel → Node.js:**
   - **Application root:** `/home/reeg2836/nodejs/gissapp` (full absolute path)
   - **Application URL:** `reeried.my.id` (root domain, not subdirectory)
   - **Startup file:** `server/index.js`
   - **Status:** Should show "Running" (green/ON)

2. **Check the assigned port:**
   - In cPanel Node.js interface, your app should show a port number
   - This port is where your Node.js app is actually running
   - cPanel automatically proxies requests to this port

### Solution 4: Use Subdomain Instead (Alternative)

If conflicts persist, create a subdomain:

1. **In cPanel → Subdomains:**
   - Create subdomain: `app.reeried.my.id`
   - Point it to `nodejs/gissapp`

2. **In cPanel → Node.js:**
   - Change **Application URL** to `app.reeried.my.id`
   - This avoids public_html conflicts entirely

## How cPanel Node.js Apps Work

1. **Node.js app runs on a port** (e.g., 3001, 3002, etc.)
2. **cPanel creates a reverse proxy** that forwards requests to that port
3. **Apache serves public_html** for regular files
4. **The proxy takes precedence** when the Node.js app is running

## Verification Steps

1. **Check if app is running:**
   - cPanel → Node.js → Status should be "Running"

2. **Check application logs:**
   - cPanel → Node.js → "View Logs"
   - Should show: "Server running on http://0.0.0.0:PORT"
   - Should show: "Serving static files from: /home/reeg2836/nodejs/gissapp/dist"

3. **Test direct access:**
   - Visit: `https://reeried.my.id/api/health`
   - Should return JSON (proves Node.js is responding)

4. **Check public_html:**
   - Via File Manager, check if `public_html/gissapp` exists
   - If yes, remove or rename it

## Most Common Fix

**90% of the time, the issue is:**

1. There's a `gissapp` folder in `public_html/`
2. Apache serves from there instead of proxying to Node.js
3. **Solution:** Delete or rename `public_html/gissapp`

After removing it:
1. Restart your Node.js app in cPanel
2. Clear browser cache
3. Visit `https://reeried.my.id` again

## Quick Checklist

- [ ] Node.js app status is "Running"
- [ ] Application root is `/home/reeg2836/nodejs/gissapp` (full path)
- [ ] Application URL is `reeried.my.id` (root, not subdirectory)
- [ ] No `gissapp` folder in `public_html/` (or it's renamed/deleted)
- [ ] `dist` folder exists in `nodejs/gissapp/`
- [ ] Application logs show server is running

If all checked, your app should work correctly!


# cPanel Node.js - Quick Reference Card

## Form Fields to Fill (Based on Your Screenshot)

### 1. Node.js version
**⚠️ IMPORTANT:** Change from `10.24.1` to **`18.x` or `20.x` (LTS)**
- Your app uses ES modules which require Node.js 18+
- Click the dropdown and select the latest LTS version

### 2. Application mode
**Change to:** `Production` (not Development)
- This sets `NODE_ENV=production` automatically

### 3. Application root ⚠️ REQUIRED (Red border)
**Enter:** `/home/username/nodejs/gis2`
- Replace `username` with your cPanel username
- Replace `gis2` with your actual folder name
- This is the folder containing `package.json` and `server/` folder
- **This field is required** - you must fill it!

### 4. Application URL
**Current:** `reeried.my.id` ✅ (Looks correct)
- This is your domain/subdomain
- cPanel will map this URL to your Node.js app

### 5. Application startup file
**Enter:** `server/index.js`
- This is your main server file
- Relative to the Application root directory

## Environment Variables to Add

Click **"+ ADD VARIABLE"** for each:

| Variable | Value | Example |
|----------|-------|---------|
| `NODE_ENV` | `production` | (if not set by mode) |
| `DB_HOST` | `localhost` | `localhost` |
| `DB_PORT` | `3306` | `3306` |
| `DB_USER` | Your MySQL username | `username_dbuser` |
| `DB_PASSWORD` | Your MySQL password | `your_password` |
| `DB_NAME` | Your database name | `username_gis2` |

**Note:** `PORT` is usually set automatically by cPanel - don't set it manually unless needed.

## After Creating the App

1. ✅ Click **"CREATE"** button
2. ✅ Click **"Run NPM Install"** in the app list (this creates the virtual environment and symlink)
3. ✅ Click **"START APP"** to start your application
4. ✅ Visit `https://reeried.my.id` to test

## ⚠️ Important: node_modules Handling

**DO NOT upload `node_modules` folder!** CloudLinux Node.js Selector:
- Stores dependencies in a separate virtual environment
- Automatically creates a `node_modules` symlink in your app root
- If you upload `node_modules`, it will conflict with the symlink

**What to do:**
- ✅ Upload all files EXCEPT `node_modules`
- ✅ Use cPanel's "Run NPM Install" button (don't run `npm install` manually)

## Common Issues

- **"Application root" is red:** You must enter the full path to your app folder
- **App won't start:** Check logs, ensure "Run NPM Install" was clicked in cPanel
- **"node_modules is not a symlink" error:** Delete any uploaded `node_modules` folder, then click "Run NPM Install" in cPanel
- **Module not found:** Click "Run NPM Install" in cPanel (don't run `npm install` manually via SSH)
- **Database errors:** Verify environment variables match your MySQL credentials

## Full Path Example

If your cPanel username is `myuser` and you uploaded to `nodejs/gis2`:
```
Application root: /home/myuser/nodejs/gis2
```

If you uploaded to `public_html/gis2`:
```
Application root: /home/myuser/public_html/gis2
```


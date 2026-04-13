# cPanel Node.js Deployment Guide

This guide will help you deploy your GIS2 application to cPanel using the Node.js installer.

## ⚠️ CRITICAL: CloudLinux Node.js Selector Virtual Environment

**IMPORTANT:** CloudLinux Node.js Selector uses a virtual environment system for `node_modules`:

- **DO NOT upload `node_modules` folder** - it will conflict with the symlink
- **DO NOT create `node_modules` folder manually** - CloudLinux creates it automatically
- **DO NOT run `npm install` via SSH** - use cPanel's "Run NPM Install" button instead

When you create the Node.js app and click "Run NPM Install" in cPanel:
1. Dependencies are installed into a separate virtual environment folder
2. A `node_modules` symlink is automatically created in your application root
3. This symlink points to the virtual environment

If you upload a `node_modules` folder, it will prevent the symlink from being created and cause errors.

## Prerequisites

1. Access to cPanel with Node.js installer enabled
2. MySQL database created in cPanel
3. All your application files uploaded to your hosting account

## Step 1: Prepare Your Application

### 1.1 Build the Frontend

Before uploading, build your frontend:

```bash
npm run build
```

This creates the `dist` folder with your production-ready frontend.

### 1.2 Upload Files to cPanel

Upload all your application files to your cPanel account. Recommended structure:

```
/home/username/
  └── nodejs/
      └── gis2/          (or your preferred folder name)
          ├── server/
          ├── dist/
          ├── uploads/
          ├── public/
          ├── package.json
          ├── package-lock.json
          └── ... (all other files)
```

**⚠️ CRITICAL - CloudLinux Node.js Selector Requirement:**

**DO NOT upload `node_modules` folder!** CloudLinux Node.js Selector uses a virtual environment system:
- Dependencies are stored in a separate virtual environment folder
- A `node_modules` symlink is automatically created pointing to the virtual environment
- If you upload a `node_modules` folder, it will conflict with the symlink and cause errors

**What to upload:**
- ✅ All source files (`server/`, `src/`, `public/`, etc.)
- ✅ `package.json` and `package-lock.json` (required for npm install)
- ✅ `dist` folder (from `npm run build`)
- ✅ `uploads` folder if you have existing files
- ❌ **DO NOT upload `node_modules` folder**
- ❌ **DO NOT create `node_modules` folder manually**

**After creating the Node.js app in cPanel, use the "Run NPM Install" button** - this will install dependencies into the virtual environment automatically.

## Step 2: Configure cPanel Node.js Application

### 2.1 Access Node.js Installer

1. Log in to cPanel
2. Find and click on **"Node.js"** or **"Setup Node.js App"**
3. Click **"CREATE APPLICATION"**

### 2.2 Fill in the Application Form

Based on the screenshot you shared, fill in these fields:

#### **Node.js version:**
- Select the **latest LTS version** (18.x or 20.x recommended)
- Your app uses ES modules (`"type": "module"`), so Node.js 18+ is required
- **Do NOT use 10.24.1** - it's too old

#### **Application mode:**
- Select **"Production"** (not Development)

#### **Application root:**
- Enter the **full path** to your application folder
- Example: `/home/username/nodejs/gis2`
- Or if in public_html: `/home/username/public_html/gis2`
- **This is the folder containing your `package.json` and `server/` folder**

#### **Application URL:**
- Your domain: `reeried.my.id` (or your subdomain)
- cPanel will automatically create the URL mapping

#### **Application startup file:**
- Enter: `server/index.js`
- This is the main server file

### 2.3 Environment Variables

Click **"+ ADD VARIABLE"** and add these environment variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NODE_ENV` | `production` | Sets production mode |
| `PORT` | (leave empty or set to cPanel's assigned port) | cPanel usually sets this automatically |
| `DB_HOST` | `localhost` | MySQL host (usually localhost) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `your_db_username` | Your MySQL username |
| `DB_PASSWORD` | `your_db_password` | Your MySQL password |
| `DB_NAME` | `your_database_name` | Your MySQL database name |

**Important Notes:**
- cPanel will automatically set `PORT` - you usually don't need to set it manually
- Get your MySQL credentials from cPanel → MySQL Databases
- Never commit these values to git!

## Step 3: Install Dependencies

After creating the application:

1. In the Node.js app list, find your application
2. Click **"Run NPM Install"** button
   - This will install dependencies into CloudLinux's virtual environment
   - A `node_modules` symlink will be automatically created in your app root
   - **Do NOT run `npm install` manually via SSH** - use the cPanel button instead

**Important:** CloudLinux manages `node_modules` in a virtual environment. The symlink is created automatically when you click "Run NPM Install" in cPanel.

## Step 4: Initialize Database

1. Access phpMyAdmin from cPanel
2. Select your database
3. Import the schema: `database/schema.sql`
4. If needed, run migrations: `database/migration_add_layer_group.sql`

## Step 5: Set File Permissions

Set proper permissions for uploads folder:

```bash
chmod 755 uploads
chmod 755 uploads/river-map
chmod 755 uploads/condition-photos
```

Or via cPanel File Manager:
- Right-click `uploads` folder → Change Permissions → Set to `755`

## Step 6: Start the Application

1. In cPanel Node.js app list
2. Find your application
3. Click **"START APP"** or toggle it ON

## Step 7: Verify Deployment

1. Visit your application URL: `https://reeried.my.id` (or your configured URL)
2. Check if the app loads correctly
3. Test admin login
4. Test file uploads
5. Check browser console for errors

## Troubleshooting

### App Won't Start

1. **Check Logs:**
   - In cPanel Node.js app, click **"View Logs"**
   - Look for error messages

2. **Common Issues:**
   - **Port already in use:** cPanel manages ports automatically
   - **Module not found:** Click "Run NPM Install" in cPanel Node.js interface (don't run manually)
   - **"node_modules is not a symlink" error:** Delete any `node_modules` folder you uploaded, then click "Run NPM Install" in cPanel
   - **Database connection failed:** Check environment variables
   - **Permission denied:** Check file permissions on `uploads/` folder

### Database Connection Errors

1. Verify MySQL credentials in environment variables
2. Check if MySQL is running in cPanel
3. Ensure database exists and user has permissions
4. Test connection via phpMyAdmin

### Static Files Not Loading

1. Ensure `dist` folder exists and contains built files
2. Check if `npm run build` was run before upload
3. Verify file permissions on `dist` folder

### Upload Errors

1. Check `uploads` folder permissions (should be 755)
2. Verify folder exists: `uploads/river-map` and `uploads/condition-photos`
3. Check disk quota in cPanel

## Updating the Application

When you make changes:

1. **Update files** via FTP/cPanel File Manager
2. **Rebuild frontend** (if frontend changed):
   ```bash
   npm run build
   ```
   Then upload the new `dist` folder
3. **Restart the app** in cPanel Node.js interface
4. **Run migrations** if database schema changed

## Recommended cPanel Settings Summary

```
Node.js Version: 18.x or 20.x (LTS)
Application Mode: Production
Application Root: /home/username/nodejs/gis2
Application URL: reeried.my.id
Startup File: server/index.js
```

## Environment Variables Template

```
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
```

## Notes

- **CloudLinux Virtual Environment:** `node_modules` is managed by CloudLinux in a separate virtual environment folder. A symlink is created automatically - do not upload or create `node_modules` manually.
- cPanel Node.js apps run behind a reverse proxy, so `PORT` is usually set automatically
- The app serves both API (`/api/*`) and static files (`/dist/*`)
- Uploads are stored in the `uploads/` folder in your application root
- Make sure to backup your database regularly via cPanel

## Support

If you encounter issues:
1. Check cPanel error logs
2. Check Node.js application logs in cPanel
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed


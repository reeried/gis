# Fix: Database Not Available Error

## The Problem

When trying to save "Data Sungai" (Google Sheets URL), you get:
- `503 Service Unavailable`
- `Error: Database not available. Please configure database connection.`

## Root Cause

The database connection is not configured or not working. The app needs MySQL database credentials to save settings.

## Solution: Configure Database in cPanel

### Step 1: Create MySQL Database

1. **Go to cPanel → MySQL Databases**
2. **Create a new database:**
   - Enter database name (e.g., `reeg2836_gis2`)
   - Click **"Create Database"**
   - Note the full database name (usually `username_dbname`)

### Step 2: Create MySQL User

1. **In MySQL Databases section:**
2. **Create a new user:**
   - Enter username (e.g., `reeg2836_gisuser`)
   - Enter a strong password
   - Click **"Create User"**
   - Note the full username (usually `username_dbuser`)

### Step 3: Add User to Database

1. **In "Add User to Database" section:**
2. **Select:**
   - User: `reeg2836_gisuser`
   - Database: `reeg2836_gis2`
3. **Click "Add"**
4. **Check "ALL PRIVILEGES"**
5. **Click "Make Changes"**

### Step 4: Set Environment Variables in cPanel

1. **Go to cPanel → Node.js**
2. **Find your application** (`gissapp`)
3. **Click "Edit" or settings icon**
4. **Add these environment variables:**

| Variable Name | Value | Example |
|--------------|-------|---------|
| `DB_HOST` | `localhost` | `localhost` |
| `DB_PORT` | `3306` | `3306` |
| `DB_USER` | Your MySQL username | `reeg2836_gisuser` |
| `DB_PASSWORD` | Your MySQL password | `your_password` |
| `DB_NAME` | Your database name | `reeg2836_gis2` |
| `NODE_ENV` | `production` | `production` |

**Important:** Use the **full names** (with username prefix) that cPanel shows you.

### Step 5: Import Database Schema

1. **Go to cPanel → phpMyAdmin**
2. **Select your database** from the left sidebar
3. **Click "Import" tab**
4. **Choose file:** Upload `database/schema.sql` from your project
5. **Click "Go"** to import

This creates all necessary tables including `app_settings`.

### Step 6: Restart Node.js App

1. **cPanel → Node.js**
2. **Restart your application**
3. **Check logs** to verify database connection

## Verify Database Connection

### Check Application Logs

1. **cPanel → Node.js → "View Logs"**
2. **Look for:**
   - ✅ `✅ Database connection successful`
   - ✅ `MySQL connection pool created`
   - ❌ `Database initialization failed` → Check credentials
   - ❌ `Access denied` → Check username/password

### Test Database Connection

**Via phpMyAdmin:**
1. Go to **cPanel → phpMyAdmin**
2. Select your database
3. Check if `app_settings` table exists
4. If not, import `database/schema.sql`

## Common Issues

### Issue 1: Wrong Database Credentials

**Symptom:** Logs show "Access denied" or "Unknown database"

**Fix:**
- Double-check username, password, and database name in cPanel
- Use full names (with username prefix)
- Make sure user has ALL PRIVILEGES on the database

### Issue 2: Database Not Created

**Symptom:** "Unknown database" error

**Fix:**
- Create database in cPanel → MySQL Databases
- Make sure to use the full database name

### Issue 3: Tables Don't Exist

**Symptom:** "Table doesn't exist" error

**Fix:**
- Import `database/schema.sql` via phpMyAdmin
- Or the tables will be created automatically on first run (if connection works)

### Issue 4: Environment Variables Not Set

**Symptom:** Database not available

**Fix:**
- Add all 5 environment variables in cPanel Node.js interface
- Restart the app after adding variables

## Quick Checklist

- [ ] MySQL database created in cPanel
- [ ] MySQL user created in cPanel
- [ ] User added to database with ALL PRIVILEGES
- [ ] Environment variables set in cPanel Node.js:
  - [ ] `DB_HOST=localhost`
  - [ ] `DB_PORT=3306`
  - [ ] `DB_USER=your_full_username`
  - [ ] `DB_PASSWORD=your_password`
  - [ ] `DB_NAME=your_full_database_name`
- [ ] Database schema imported (`database/schema.sql`)
- [ ] Node.js app restarted
- [ ] Application logs show "Database connection successful"

## After Setup

Once the database is configured:

1. **Restart the Node.js app**
2. **Check logs** - should show database connection successful
3. **Try saving Google Sheets URL again** - should work now
4. **Test other features** that require database (file uploads, etc.)

## Get Database Credentials from cPanel

**To find your database credentials:**

1. **cPanel → MySQL Databases**
2. **Look at "Current Databases"** - shows full database name
3. **Look at "Current Users"** - shows full username
4. **Use these full names** in environment variables

**Example:**
- Database name shown: `reeg2836_gis2` → Use this in `DB_NAME`
- Username shown: `reeg2836_gisuser` → Use this in `DB_USER`

## Notes

- **Database host is always `localhost`** in cPanel
- **Port is usually `3306`** (default MySQL port)
- **Use full names** (with username prefix) for database and user
- **Password** is the one you created for the MySQL user
- **After setting environment variables, always restart the app**

If you still have issues after following these steps, check the application logs and share the error messages!


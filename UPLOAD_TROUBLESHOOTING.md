# File Upload Troubleshooting Guide

## Error: "Cannot connect to server. Please make sure the backend server is running."

This error occurs when the frontend cannot reach the backend API server. Follow these steps to diagnose and fix the issue.

## Quick Checks

### 1. Verify Server is Running

Check if the server is running on port 3001:

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :3001
```

**Windows (CMD):**
```cmd
netstat -ano | findstr :3001
```

**Linux/Mac:**
```bash
lsof -i :3001
# or
netstat -an | grep 3001
```

You should see output indicating the server is listening on port 3001.

### 2. Test Server Health Endpoint

Open your browser and visit:
- `http://localhost:3001/api/health`

You should see a JSON response like:
```json
{"status":"ok","server":"running"}
```

If this doesn't work, the server is not running or not accessible.

### 3. Check How You're Running the App

#### Option A: Development Mode (Vite + Express)
```bash
npm run dev:all
```
This runs:
- Vite dev server on `http://localhost:5173` (frontend)
- Express server on `http://localhost:3001` (backend API)

**Access the app at:** `http://localhost:5173`

The Vite proxy will forward `/api/*` requests to `http://localhost:3001/api/*`

#### Option B: Production Mode (Express only)
```bash
npm run build
npm start
```
This runs:
- Express server on `http://localhost:3001` (serves both frontend and API)

**Access the app at:** `http://localhost:3001`

All requests go directly to the Express server.

### 4. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for error messages
- **Network tab**: 
  - Check if the request to `/api/files/upload` is being made
  - Check the request URL (should be `http://localhost:3001/api/files/upload` or relative `/api/files/upload`)
  - Check the response status (should be 200 for success)
  - Check for CORS errors

### 5. Common Issues and Solutions

#### Issue: Server Not Running
**Solution:**
```bash
# Start the server
npm run dev:server
# or for production
npm start
```

#### Issue: Wrong URL Access
**Problem:** Accessing the app from a different URL than expected.

**Solution:**
- If using `npm run dev:all`, access at `http://localhost:5173`
- If using `npm start`, access at `http://localhost:3001`
- Don't access via `file://` protocol (won't work with API calls)

#### Issue: CORS Error
**Symptoms:** Browser console shows CORS error.

**Solution:** The server already has CORS enabled. If you still see CORS errors:
1. Check that you're accessing the app from the correct URL
2. Verify the server is running
3. Check server logs for CORS-related messages

#### Issue: Port Already in Use
**Symptoms:** Server fails to start with "port already in use" error.

**Solution:**
```bash
# Windows: Find and kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Linux/Mac: Find and kill process
lsof -ti:3001 | xargs kill -9
```

Then restart the server.

#### Issue: API Route Not Found (404)
**Symptoms:** Network tab shows 404 for `/api/files/upload`

**Solution:**
1. Verify the server is running
2. Check that `server/index.js` has the route defined
3. Test the health endpoint: `http://localhost:3001/api/health`
4. Check server logs for route registration

#### Issue: Form Data Not Being Sent
**Symptoms:** Server receives request but `req.file` is undefined

**Solution:**
1. Check browser console for FormData entries
2. Verify the file is being added to FormData
3. Check server logs for multer errors
4. Ensure file size is under 500MB limit

## Debugging Steps

### Step 1: Check Server Logs
When you try to upload, check the terminal where the server is running. You should see:
```
POST /api/files/upload route hit
Upload request received: { hasFile: true, fileName: '...', fileSize: ... }
```

If you don't see these logs, the request isn't reaching the server.

### Step 2: Check Browser Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try uploading a file
4. Look for the request to `/api/files/upload`
5. Check:
   - Request URL (should be correct)
   - Request Method (should be POST)
   - Status Code (200 = success, 400/500 = error)
   - Response (should be JSON)

### Step 3: Test API Directly
You can test the API directly using curl or Postman:

**Windows (PowerShell):**
```powershell
$filePath = "path\to\your\file.kml"
$uri = "http://localhost:3001/api/files/upload"
$form = @{
    file = Get-Item -Path $filePath
}
Invoke-RestMethod -Uri $uri -Method Post -Form $form
```

**Linux/Mac:**
```bash
curl -X POST http://localhost:3001/api/files/upload \
  -F "file=@/path/to/your/file.kml"
```

### Step 4: Check Environment Variables
Verify environment variables are set correctly:
- `NODE_ENV` (development or production)
- `PORT` (defaults to 3001)
- `MAX_FILE_SIZE` (defaults to 500MB)

## Enhanced Error Messages

The updated code now provides more detailed error messages:
- Shows the full API URL being called
- Shows the current window location
- Provides better error context

Check the browser console for these detailed logs when debugging.

## Still Having Issues?

1. **Check server logs** - Look for any error messages
2. **Check browser console** - Look for detailed error logs
3. **Verify file format** - Only `.kml` and `.kmz` files are allowed
4. **Check file size** - Must be under 500MB (default)
5. **Test with a small file first** - Rule out file size issues
6. **Restart both servers** - Sometimes a restart fixes connection issues

## Quick Test

Run this command to test if the server is accessible:
```bash
# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:3001/api/health

# Linux/Mac
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status":"ok","server":"running"}
```

If this works, the server is running correctly. If not, start the server first.


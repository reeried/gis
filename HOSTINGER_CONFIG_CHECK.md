# Hostinger Configuration Check

## Current Configuration Summary

### Environment Variables
| Variable | Current Value | Default | Status |
|----------|--------------|---------|--------|
| `NODE_ENV` | `development` (local) | `development` | ⚠️ Should be `production` on Hostinger |
| `PORT` | `3001` | `3001` | ✅ OK (Hostinger may override) |
| `MAX_FILE_SIZE` | `500` MB | `500` MB | ✅ OK |

### Server Configuration (`server/index.js`)

#### File Upload Settings
- **Storage**: `uploads/` directory (project root)
- **Max File Size**: 500MB (configurable via `MAX_FILE_SIZE` env var)
- **Allowed Extensions**: `.kml`, `.kmz`
- **Storage Type**: `multer.diskStorage` (persistent)

#### Middleware Configuration
- **CORS**: Enabled (all origins)
- **Body Parser**: 
  - JSON limit: `500mb`
  - URL-encoded limit: `500mb`
- **Static Files**: 
  - `/uploads` → serves uploaded files
  - `/dist` → serves frontend (production only)

#### Multer Configuration
```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,  // uploads/ directory
    filename: unique timestamp-based naming
  }),
  limits: {
    fileSize: MAX_FILE_SIZE  // 500MB default
  },
  fileFilter: .kml and .kmz only
});
```

## Hostinger-Specific Requirements

### ✅ Configured Correctly
1. **Persistent Storage**: Files stored in `uploads/` directory (not `/tmp`)
2. **Large File Support**: 500MB limit (vs Vercel's 4.5MB)
3. **Express Server**: Single server handles API + frontend
4. **Production Mode**: Serves `dist/` folder in production

### ⚠️ Things to Verify on Hostinger

#### 1. Environment Variables
Ensure these are set in Hostinger control panel:
```
NODE_ENV=production
PORT=3001 (or Hostinger-assigned port)
MAX_FILE_SIZE=500 (optional, default is 500MB)
```

#### 2. Directory Permissions
The `uploads/` directory must be writable:
```bash
chmod 755 uploads
```

#### 3. Node.js Version
- Required: Node.js 18.x or 20.x
- Verify in Hostinger control panel

#### 4. Start Command
Should be set to:
```
npm start
```

Which runs:
```bash
NODE_ENV=production node server/index.js
```

#### 5. Build Command (if using Git deployment)
Should be set to:
```
npm run build
```

### 🔍 Potential Issues to Check

#### File Upload Issues
1. **Multer Configuration**: Currently using `multer.diskStorage` - this should work on Hostinger
2. **Form Data Parsing**: Ensure `express.urlencoded` is properly configured (✅ Already set)
3. **Request Size Limits**: Both Express and Multer limits are set to 500MB

#### Server Configuration Issues
1. **Port Assignment**: Hostinger may assign a different port - check `PORT` env var
2. **Static File Serving**: Verify `dist/` folder exists and is served correctly
3. **SPA Routing**: Ensure catch-all route is configured (✅ Already configured)

#### Directory Structure
Expected structure on Hostinger:
```
project-root/
├── server/
│   └── index.js
├── dist/              # Built frontend
├── uploads/           # Uploaded files (must be writable)
│   └── metadata.json
├── src/               # Source files
├── package.json
└── package.json
```

## Testing Checklist

### Before Deployment
- [ ] Test locally with `NODE_ENV=production`
- [ ] Verify `dist/` folder exists after build
- [ ] Test file upload locally
- [ ] Check `uploads/` directory permissions

### After Deployment
- [ ] Verify Node.js version (18+)
- [ ] Check environment variables are set
- [ ] Test `/api/health` endpoint
- [ ] Test file upload with small file
- [ ] Test file upload with large file (< 500MB)
- [ ] Verify files persist after upload
- [ ] Check server logs for errors

## Current Configuration Status

### ✅ Server Configuration
- Express server configured correctly
- Multer configured for persistent storage
- CORS enabled
- Body parser limits set correctly
- Static file serving configured
- SPA routing configured

### ⚠️ Needs Verification on Hostinger
- Environment variables
- Directory permissions
- Node.js version
- Port assignment
- File upload functionality

## Recommendations

1. **Test Locally First**: Run `npm run build && npm start` and test all features
2. **Check Logs**: Monitor Hostinger server logs after deployment
3. **Verify Permissions**: Ensure `uploads/` directory is writable
4. **Test Incrementally**: Start with small files, then test larger ones
5. **Monitor Disk Space**: Hostinger may have disk space limits

## Troubleshooting

If file uploads fail on Hostinger:

1. **Check Server Logs**: Look for multer errors or file system errors
2. **Verify Permissions**: `chmod 755 uploads` or `chmod 777 uploads` (if needed)
3. **Check Disk Space**: Ensure enough storage available
4. **Verify File Size**: Ensure file is under 500MB limit
5. **Check Environment Variables**: Verify `MAX_FILE_SIZE` is set correctly
6. **Test API Endpoint**: Use `/api/health` to verify server is running

## Configuration Files Reference

- **Server**: `server/index.js`
- **Package Scripts**: `package.json`
- **Deployment Guide**: `HOSTINGER_DEPLOYMENT_GUIDE.md`
- **Environment**: Set in Hostinger control panel

---

**Last Updated**: Configuration checked against current `server/index.js` implementation


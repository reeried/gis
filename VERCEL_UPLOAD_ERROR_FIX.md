# Fix for Vercel Upload Errors

## Problem

When trying to upload files on Vercel (`gis3.vercel.app`), you may encounter errors such as:
- "Cannot connect to server"
- "Request was truncated"
- "Unexpected end of form"
- Upload fails silently

## Root Cause

**Vercel has a hard 4.5MB limit for serverless function request bodies.** This is a platform limitation that cannot be changed.

### What This Means:
- Files larger than 4.5MB **cannot** be uploaded to Vercel serverless functions
- Even if your code allows larger files, Vercel will reject the request body before it reaches your function
- This results in incomplete requests, truncated form data, or connection errors

## Solutions

### Option 1: Use Smaller Files (Quick Fix)
- Compress your KML/KMZ files to under 4.5MB
- Split large files into multiple smaller files
- Remove unnecessary data from KML files

### Option 2: Deploy to Hostinger (Recommended for Large Files)
Hostinger supports files up to **500MB** and provides persistent storage.

**Benefits:**
- ✅ 500MB file size limit (vs Vercel's 4.5MB)
- ✅ Persistent file storage (files don't disappear)
- ✅ Full control over server configuration
- ✅ No serverless limitations

**See:** `HOSTINGER_DEPLOYMENT_GUIDE.md` for deployment instructions.

### Option 3: Use Vercel Blob Storage (Advanced)
For Vercel deployments, you can use Vercel Blob Storage to handle larger files:
- Requires Vercel Pro plan or higher
- Files are stored in Vercel Blob, not in serverless function `/tmp`
- More complex implementation

**See:** https://vercel.com/docs/storage/vercel-blob

## Error Messages

The application now provides clear error messages when files exceed Vercel's limit:

- **413 Payload Too Large**: "File size exceeds Vercel's 4.5MB limit. Please use a smaller file or deploy to Hostinger for larger file support (up to 500MB)."
- **Request Truncated**: "File upload failed: Request was truncated. This usually means the file exceeds Vercel's 4.5MB limit."

## How to Check File Size

Before uploading, check your file size:
- **Windows**: Right-click file → Properties → Check "Size"
- **Mac/Linux**: Right-click file → Get Info, or use `ls -lh filename.kml`
- **Browser**: The upload component will show file size before upload

## Testing

1. **Test with small file (< 4.5MB)**:
   - Should upload successfully on Vercel

2. **Test with large file (> 4.5MB)**:
   - Will fail on Vercel with clear error message
   - Will work on Hostinger (up to 500MB)

## Current Status

✅ **Fixed**: Error handling now detects and reports Vercel's 4.5MB limit clearly
✅ **Fixed**: Frontend shows helpful error messages
✅ **Fixed**: Server rejects files > 4.5MB early with clear message

## Next Steps

1. **For small files (< 4.5MB)**: Continue using Vercel
2. **For large files (> 4.5MB)**: Deploy to Hostinger (see `HOSTINGER_DEPLOYMENT_GUIDE.md`)
3. **For production**: Consider Hostinger for better file size support and persistent storage

## Comparison

| Feature | Vercel | Hostinger |
|---------|--------|-----------|
| Max File Size | 4.5MB | 500MB |
| Storage | Ephemeral (`/tmp`) | Persistent (`uploads/`) |
| Architecture | Serverless | Traditional Node.js |
| Cost | Free tier available | Paid hosting |
| Best For | Small files, quick deployments | Large files, production use |

---

**Note**: The codebase supports both Vercel and Hostinger deployments. The same code works on both platforms, but Hostinger is recommended for production use with larger files.


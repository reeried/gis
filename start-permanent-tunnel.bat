@echo off
REM Cloudflare Tunnel Starter Script for Permanent Tunnel (Windows)
REM This script starts a permanent Cloudflare Tunnel pointing to localhost:3001

echo ========================================
echo Starting Permanent Cloudflare Tunnel
echo ========================================
echo.
echo Make sure you have:
echo   1. Created the tunnel: cloudflared tunnel create gis-app
echo   2. Set up DNS record in Cloudflare Dashboard
echo   3. Created config.yml file
echo   4. Updated .env with permanent URL
echo.
echo Press Ctrl+C to stop the tunnel
echo.

cloudflared tunnel run gis-app

pause


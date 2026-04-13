@echo off
REM Cloudflare Tunnel Starter Script for Windows
REM This script starts a Cloudflare Tunnel pointing to localhost:3001

echo Starting Cloudflare Tunnel...
echo.
echo This will create a temporary tunnel URL.
echo For a permanent tunnel, use: cloudflared tunnel run gis-app
echo.

cloudflared tunnel --url http://localhost:3001

pause


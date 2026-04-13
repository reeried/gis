import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path for subdirectory deployment (e.g., '/gissapp/')
// Set via environment variable VITE_BASE_PATH or default to root '/'
// For cPanel subdirectory: set VITE_BASE_PATH=/gissapp/
// For root domain: leave empty or set VITE_BASE_PATH=/
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    allowedHosts: [
      '.trycloudflare.com',
      '.cfargotunnel.com',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Ensure assets are referenced correctly for subdirectory
    assetsDir: 'assets',
  },
})


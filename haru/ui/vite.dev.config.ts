import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kirocrew/app-sdk/ui': path.resolve(__dirname, 'src/sdk/kiro-sdk-ui-shim.tsx'),
      '@kirocrew/app-sdk': path.resolve(__dirname, 'src/sdk/kiro-sdk-shim.ts'),
    },
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
  },
  server: {
    port: 5179,
    proxy: {
      '/apps/haru/api': {
        target: process.env.HARU_BACKEND_URL || 'http://127.0.0.1:4317',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.HARU_BACKEND_URL || 'http://127.0.0.1:4317',
        changeOrigin: true,
      },
    },
  },
});
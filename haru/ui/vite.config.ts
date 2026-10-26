import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kirocrew/app-sdk': path.resolve(__dirname, 'src/sdk/kiro-sdk-shim.ts'),
      '@kirocrew/ui': path.resolve(__dirname, 'src/sdk/kiro-sdk-ui-shim.tsx'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/App.tsx'),
      formats: ['es'],
      fileName: () => 'haru-0.1.2.mjs',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/apps/haru/api': {
        target: 'http://127.0.0.1:9100',
        changeOrigin: true,
      },
      '/api/apps/haru': {
        target: 'http://127.0.0.1:9100',
        changeOrigin: true,
      },
    },
  },
});

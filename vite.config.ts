import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_APP_SECRET) {
    console.warn('\n⚠️  VITE_APP_SECRET is not set — the frontend build will make unauthenticated API requests.\n');
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-charts': ['recharts'],
            'vendor-motion': ['motion'],
            'vendor-markdown': ['react-markdown', 'remark-gfm'],
            'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

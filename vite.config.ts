import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
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
          manualChunks(id) {
              if (id.includes('node_modules')) {
                // 1. React Core (Must be solid)
                if (
                  id.includes('react/') ||
                  id.includes('react-dom/') ||
                  id.includes('scheduler/') ||
                  id.includes('jsx-runtime')
                ) {
                  return 'react-vendor';
                }
                // 2. Heavy hitters
                if (id.includes('react-markdown') || id.includes('remark-gfm')) {
                  return 'markdown';
                }
                if (id.includes('recharts') || id.includes('d3-')) {
                  return 'charts';
                }
                if (id.includes('@stripe')) {
                  return 'stripe';
                }
                // 3. Everything else node_modules
                return 'vendor';
              }
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

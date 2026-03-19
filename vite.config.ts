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
                // Keep all React-related code together to prevent duplication
                if (id.includes('react') || id.includes('scheduler')) {
                  return 'react-vendor';
                }
                // Heavy libraries
                if (id.includes('recharts') || id.includes('d3-')) {
                  return 'charts';
                }
                if (id.includes('@stripe')) {
                  return 'stripe';
                }
                // Everything else
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

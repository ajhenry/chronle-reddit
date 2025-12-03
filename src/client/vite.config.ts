import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './'),
    },
  },
  build: {
    outDir: '../../dist/client',
    sourcemap: true,
    rollupOptions: {
      input: {
        splash: 'splash.html',
        index: 'index.html',
        creator: 'creator.html',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        sourcemapFileNames: '[name].js.map',
      },
    },
  },
});

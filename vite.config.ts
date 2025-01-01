import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: './src/client',
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@scenes': path.resolve(__dirname, './src/scenes'),
    },
  },
});

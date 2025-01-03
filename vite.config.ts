import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, 'src/client'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});

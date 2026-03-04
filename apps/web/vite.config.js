import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем __dirname в ES модулях
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/variables.scss" as *;
          @use "@/styles/mixins.scss" as *;
        `,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://192.0.2.17:9001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, '/src/components'),
      '@pages': path.resolve(__dirname, '/src/pages'),
      '@assets': path.resolve(__dirname, '/src/assets'),
    },
  },
});

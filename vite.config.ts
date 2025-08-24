import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@gameObjects': resolve(__dirname, 'src/gameObjects'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@config': resolve(__dirname, 'src/config'),
      '@assets': resolve(__dirname, 'assets')
    }
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    cors: true
  },
  preview: {
    port: 5174,
    host: true
  },
  optimizeDeps: {
    include: ['phaser']
  }
});
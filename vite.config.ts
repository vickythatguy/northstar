import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from https://<user>.github.io/northstar/,
// so production assets need the '/northstar/' base. Dev stays at '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/northstar/' : '/',
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    // Split the heavy 3D libraries into their own chunks so the browser can
    // cache them separately from app code (and it quiets the size warning).
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
}));

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
}));

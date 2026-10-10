import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built app works from any folder or static host (routes use #/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Requests to /api are forwarded to the Express server, so the browser sees one website.
    proxy: { '/api': 'http://localhost:3001' },
  },
});

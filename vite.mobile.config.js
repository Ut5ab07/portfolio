import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { inlineStylesheet, vercelAnalytics } from './vite.config.js';

// The mobile edition (mobile.html, served at /mobile and, for phones and tablets, at /). Built on its own, after the
// cinematic build and into the same folder, so it shares no chunks with the cinematic edition and never loads three.js.
export default defineConfig({
  plugins: [react(), inlineStylesheet(), vercelAnalytics()],
  publicDir: false,                       // public/ is already copied by the cinematic build
  build: {
    emptyOutDir: false,
    rollupOptions: { input: 'mobile.html' },
  },
});

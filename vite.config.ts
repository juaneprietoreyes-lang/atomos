import { defineConfig } from 'vitest/config';

// Rutas relativas: la misma compilación sirve en GitHub Pages (/atomos/) y en Cloudflare (raíz).
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  // Three.js ocupa ~600 kB sin comprimir; el total comprimido ronda 210 kB
  build: { chunkSizeWarningLimit: 1000 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

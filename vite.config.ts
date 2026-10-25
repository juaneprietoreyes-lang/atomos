import { defineConfig } from 'vitest/config';

// En GitHub Pages la web vive en /atomos/; en local, en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/atomos/' : '/',
  worker: { format: 'es' },
  // Three.js ocupa ~600 kB sin comprimir; el total comprimido ronda 210 kB
  build: { chunkSizeWarningLimit: 1000 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));

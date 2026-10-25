import { defineConfig } from 'vitest/config';

// En GitHub Pages la web vive en /atomos/; en local, en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/atomos/' : '/',
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));

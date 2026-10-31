import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node24',
  clean: true,
  sourcemap: true,
  dts: true,
  minify: false,
  noExternal: ['@crewloom/contracts'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist',
});

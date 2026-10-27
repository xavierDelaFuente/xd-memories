import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'sources', include: ['src/**/*.spec.ts'] },
});

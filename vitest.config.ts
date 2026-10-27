import { defineConfig } from 'vitest/config';

// One project per workspace package; each package's own vitest.config.ts decides where its tests live.
export default defineConfig({
  test: { projects: ['packages/*', 'apps/*'] },
});

import { defineConfig } from 'vitest/config';

// Integration tests start Postgres in Docker; the first pull of the image takes a while.
export default defineConfig({
  test: { name: 'db', include: ['src/**/*.spec.ts'], hookTimeout: 120_000 },
});

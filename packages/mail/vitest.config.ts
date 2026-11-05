import { defineConfig } from 'vitest/config';

// Integration tests start Mailpit in Docker; the first pull of the image takes a while.
export default defineConfig({
  test: { name: 'mail', include: ['src/**/*.spec.ts'], hookTimeout: 120_000 },
});

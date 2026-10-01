import { defineConfig } from '@playwright/test';

// Budget: one flow per user-visible feature, whole suite < 5 min (CODEX Testing).
export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'pnpm build && pnpm start', port: 3000, reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:3000' },
});

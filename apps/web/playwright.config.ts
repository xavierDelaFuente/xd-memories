import { defineConfig } from '@playwright/test';

// Postgres from compose.yaml (docker compose up -d --wait), locally and in CI.
const E2E_DATABASE_URL = 'postgres://postgres:postgres@localhost:5433/xd_memories_e2e';

// Budget: one flow per user-visible feature, whole suite < 5 min (CODEX Testing).
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'pnpm --filter @xd-memories/db migrate && pnpm build && pnpm start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    // Set here, so a DATABASE_URL in the root .env (Neon) is never touched by E2E runs.
    env: {
      CATALOG_SOURCE: 'fixtures',
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_SECRET: 'e2e-secret-that-is-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
    },
  },
  use: { baseURL: 'http://localhost:3000' },
});

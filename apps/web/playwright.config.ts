import { defineConfig } from '@playwright/test';

// Postgres and Mailpit from compose.yaml (docker compose up -d --wait), locally and in CI.
const E2E_DATABASE_URL = 'postgres://postgres:postgres@localhost:5433/xd_memories_e2e';
// Not 3000, where pnpm dev runs: locally Playwright reuses a server already on its port, and
// would otherwise test the dev server, against the dev database.
const E2E_URL = 'http://localhost:3100';

// Budget: one flow per user-visible feature, whole suite < 5 min (CODEX Testing).
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command:
      'pnpm --filter @xd-memories/db migrate && pnpm --filter @xd-memories/db seed-demo && pnpm build && pnpm start --port 3100',
    url: E2E_URL,
    reuseExistingServer: !process.env.CI,
    // Set here, so the DATABASE_URL in the root .env (the dev database) is never touched by E2E.
    env: {
      CATALOG_SOURCE: 'fixtures',
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_SECRET: 'e2e-secret-that-is-at-least-32-characters',
      BETTER_AUTH_URL: E2E_URL,
      // Mailpit from compose.yaml: e2e/mail.ts reads the links from it.
      SMTP_URL: 'smtp://localhost:1025',
      MAIL_FROM: 'xd-memories <e2e@example.com>',
    },
  },
  use: { baseURL: E2E_URL },
});

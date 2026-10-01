# xd-memories

Track movies, series, books and music in one place; know what's next and in which order.

Mentor context lives in `.mentor/` — start every session from `.mentor/README.md`.

## Phase 0 setup

Versions are deliberately not pinned in this scaffold. Install current ones:

```bash
pnpm add -Dw typescript @biomejs/biome vitest @playwright/test
pnpm --filter @xd-memories/web add next react react-dom
pnpm --filter @xd-memories/web add -D @types/react @types/react-dom tailwindcss
pnpm --filter @xd-memories/contracts add zod
pnpm --filter @xd-memories/db add kysely pg
pnpm --filter @xd-memories/db add -D @types/pg @testcontainers/postgresql
pnpm --filter @xd-memories/worker add -D tsx
pnpm outdated
```

Then `pnpm check` (lint + type-check + test) and `pnpm build`.

## Layout

See `.mentor/PROJECT.md` → Stack.

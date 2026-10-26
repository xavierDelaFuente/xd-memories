# PROJECT — xd-memories

**Type**: app (multi-process: web + worker)
**Status**: Phase 0 of 10 — in progress. Scaffold pushed to `main`.
**Repo**: https://github.com/xavierDelaFuente/xd-memories
**Local**: C:\Users\XavierdelaFuenteQuin\Repos\personal\xd-memories

One place for everything I watch, read and listen to — movies, series, books, music — what comes
next, and in which order. Tracking earns the data; recommendations are why it exists.
Supersedes watchlog (abandoned before Phase 0). Its decisions were re-evaluated, not inherited.

## Stack

TypeScript strict · pnpm workspaces · Next.js App Router (web, Vercel Hobby) · Node (worker) ·
Supabase Postgres + Supabase Auth · Kysely (typed SQL) · zod · Tailwind (CODEX app default) ·
Biome · Vitest + Testing Library + Testcontainers + Playwright · GitHub Actions ·
Groq (hosted LLM) + Ollama (local LLM) behind one `Recommender` port · PWA manifest.

```
apps/web            ← Next.js: UI + route handlers + server actions. Holds every secret
apps/worker         ← drains the job queue: imports, matching, cache refresh. Never serves HTTP
packages/domain     ← pure: works, creators, entries, orderings, matching, ranking. Zero I/O
packages/contracts  ← zod schemas shared by web + worker
packages/db         ← Kysely + pg, migrations. The only package that touches Postgres
packages/sources    ← one adapter per external source, fixture-tested, parse-don't-cast
```

No dependency versions are pinned in the scaffold — they are added with `pnpm add` in Phase 0 so
they resolve to current (CODEX: check versions before recommending).

## Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Workspace shape | `apps/` + `packages/` | Web (request) and worker (long, rate-limited jobs) differ in runtime and cadence, and share domain types — CODEX deployable-units tree, both yes |
| No `apps/api` | Next route handlers are the API | One client today. Contracts live in `packages/contracts`, so extracting an API for a native app later is cheap |
| Catalog strategy | Search-through + cache-on-save, never mirror | "All media that exists" breaks every free tier and most terms. Search proxies to the source; a work is stored (raw payload + parsed) the first time anyone saves it |
| Movies & series | TMDB; IMDb id kept as a cross-reference only | IMDb has no free API and its datasets are personal/non-commercial use. TMDB is free with attribution and returns IMDb ids |
| Books | Open Library primary, Google Books fallback, Wikidata for series ordinals | See `docs/DATA_SOURCES.md` |
| Music | MusicBrainz + Cover Art Archive; trackable unit = release group (album) | Open data, no key. 1 req/s budget → rate limiter is domain logic |
| Domain identity | Own `WorkId`; many `ExternalRef { source, externalId, sourceVersion }` per work | Same work arrives from TMDB, an import and a user. The domain is never keyed on a vendor id |
| Consumption | Append-only `entries` (status change, progress, re-read) | History, not a boolean. Carried from watchlog |
| Rating vs highlight | Separate: rating is private signal, highlight is a public recommendation | Users rate what they would not recommend to others |
| Orderings | Named orderings per series (publication · chronological · recommended), each with provenance | A saga has more than one valid order. "Saga 2 — Book 1" is an ordering, not a field on a book |
| Community works | Same `works` table, `source = 'community'`, provenance + edit history; duplicate check before public | One query path; users cannot tell or care which source a work came from |
| Platform sync | User-triggered imports. File upload first; OAuth only where a first-party API exists; never stored passwords | Most platforms have no API. Credential scraping breaks terms and means holding user passwords |
| Matching | Pure scoring function in domain; below threshold → human review queue | An import is only as good as its matching |
| Job execution | `jobs` table in Postgres; worker run on demand by GitHub Actions | €0 and user-triggered. ALTERNATIVES, gap filled |
| Recommendations | Deterministic ranker first (Phase 8); LLM picks tools and phrases (Phase 9) | CODEX: the model never computes, never recalls |
| Reading order | Data decides (Wikidata + community orderings); model may only explain an order it was handed | Asking the model to "analyse the author" is recall — confidently wrong on newer books |
| LLM provider | `Recommender` port; Groq in prod, Ollama locally, deterministic fallback when throttled | Free. A throttled model degrades, never errors |
| Multi-tenancy | Postgres RLS on `auth.uid()` for every user-owned table | An app bug cannot leak another library. Carried from watchlog |
| Secrets | Server only. A test asserts none reach the client bundle | TMDB, Groq and OAuth secrets |
| E2E | Playwright, one flow per feature | CODEX budget. watchlog's Cypress choice not carried |
| Styling | Tailwind (CODEX app default) | See Open Question 7 |
| Mobile | Responsive web + PWA now; native (Expo) later reusing `packages/*` | Cheapest path to a phone |

## Constraints

- **€0 running cost.** Vercel Hobby (non-commercial), Supabase Free (pauses after ~1 week idle →
  weekly keep-alive Action), Groq free caps, GitHub Actions free on a public repo.
- **Non-commercial.** TMDB, IMDb ids and Vercel Hobby all assume it. Attribution shown in the UI.
- Source budgets are real: MusicBrainz 1 req/s, Open Library "be polite", TMDB rate limits.
  Imports of thousands of rows take minutes; the UI says so.
- Recommendations from other users need other users. Every collaborative number shows its `n`;
  below threshold it is not shown.
- `packages/domain` imports nothing with I/O. CI fails on violation.
- Coverage 90% on `domain` + `contracts`; adapters covered by fixture/integration tests.
- No test touches the network. Every source has a recorded, committed fixture.
- Accessibility is not a phase. Solo, learning-first: one TDD cycle at a time.

## Phases

- [ ] 0 — Repo & gate: workspace, CI (test · type-check · lint · build), Vercel preview, one green E2E
- [ ] 1 — Domain core: Work, Creator, ExternalRef, Entry, Rating, Ordering — pure, in-memory fakes
- [ ] 2 — Catalog: TMDB → Open Library → MusicBrainz adapters, per-media browse/search/filter, add to library
- [ ] 3 — Library: status, progress, ratings, highlights, auth, RLS
- [ ] 4 — Imports: job queue + worker, file importers, OAuth where available, match review
- [ ] 5 — Series & reading orders: Wikidata ordinals, named orderings, author page
- [ ] 6 — Community catalog: create works + creators, required fields, dedupe, edit history, reports
- [ ] 7 — Groups & links: user-made cross-media groups, related-from-groups first
- [ ] 8 — Recommendations v1: deterministic ranker, "ask" with filters, sample-size guards
- [ ] 9 — LLM recommender: Groq/Ollama, profile + catalog tools, clarifying question, citations, evals
- [ ] 10 — Journey: threads-over-time map and road ahead

Full rationale, reorder notes and future phases: `docs/PHASES.md`.

## Current State

**Done**: Scaffold (configs, empty packages, mentor files). Screens v1 designed (`xd-memories Screens.dc.html`).
**In progress**: nothing.
**Next**: Phase 0 — create the repo, `pnpm add` the toolchain at current versions, branch
protection, confirm all four checks go green on an empty PR. Then Phase 1 opens with a failing
test for `Entry` (BACKLOG 1.1).

## Open Questions

1. Music unit: album only, or tracks too? Proposed: release group; tracks only inside import matching.
2. Series granularity: season or episode? Proposed: season, episode progress optional.
3. When does a community work become public? Proposed: immediately, labelled, after duplicate check.
4. Moderation as a solo dev: report button + manual queue — enough while non-commercial?
5. Minimum `n` before a collaborative signal is shown. Proposed: 5 shared users per pair.
6. Supabase pausing vs Neon — decide before Phase 3 (auth migration is the expensive one).
7. Consume `@asnewyla/*` instead of Tailwind? That would need an ALTERNATIVES entry (watchlog's was never proven).
8. Spoiler policy for the model and for community descriptions.
9. "Where to watch" (TMDB watch providers, JustWatch attribution) — in scope, or a future phase?

## Reference docs

`docs/PHASES.md` — phase plan, feedback on the brief, future phases
`docs/DATA_SOURCES.md` — every source, its terms and limits
`docs/LLM_GROUNDING.md` — tools, citations, refusal, evals
`BACKLOG.md` — tasks, each with its first failing test

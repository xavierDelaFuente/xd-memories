# Phases — plan, feedback, future

## Feedback on the brief

**What is strong**
- Centralising four media types is a real gap; most trackers do one.
- User-triggered sync (not real-time) is the right call: cheaper, simpler, and honest about how
  platforms actually expose data.
- Groups as the first source of "related" is a good differentiator — human links beat similarity
  scores when there are few users.

**What needs changing**
1. **"Use IMDb" is not possible as an API.** IMDb has no free public API; its datasets are for
   personal, non-commercial use. Use TMDB (returns IMDb ids) and keep the IMDb id as a reference.
2. **"Display all media that exists" should mean search, not mirror.** Proxy searches to the
   source; store a work only when someone saves it. Mirroring breaks free tiers and terms.
3. **Ratings and highlights move early (Phase 3).** They are tracking, not recommendations, and
   every later phase needs that data.
4. **Sync moves before community content.** Imports fill libraries in minutes — that data is what
   makes recommendations possible. Community entries are rarer and need moderation first.
5. **"Recommendations from other users" has a cold start.** With few users, collaborative
   filtering returns noise. Start with content signals + group links; switch collaborative signals
   on per pair once `n ≥ 5`, and always show `n`.
6. **The LLM must not "analyse the author" from memory.** That is recall, and the CODEX forbids it
   for good reason: the model will invent books and get orders wrong. Reading orders come from data
   (Wikidata ordinals + community orderings); the model explains them.
7. **"LLM Phase 1: connect" ships nothing alone.** Folded into Phase 9 behind a port. If you want
   to learn the plumbing early, a spike in Phase 5 where the model explains an ordering is cheap.
8. **Logging into streaming platforms** must never mean storing their passwords. OAuth where a
   first-party API exists, file upload everywhere else.

**What was missing**
- A consumption model: want / in progress / done / dropped, progress, re-reads, dates.
- Identity across sources and editions (same book, two ISBNs; same album, remaster).
- Matching imported rows to works — the hardest part of sync, with a review queue.
- Multiple valid orders for a saga (publication vs chronological vs recommended).
- Moderation, duplicates and edit history for community entries; who can edit a creator.
- Privacy: profile visibility, data export, account deletion (you are storing viewing history).
- Spoiler safety in recommendations and descriptions.
- Attribution and terms per source.

## Phase plan

| #   | Phase              | Brief origin                 | Ships                                               | Screens (v1)                         |
| --- | ------------------ | ---------------------------- | --------------------------------------------------- | ------------------------------------ |
| 0   | Repo & gate        | —                            | CI, preview deploys, one green E2E                  | —                                    |
| 1   | Domain core        | —                            | Pure types + rules, in-memory fakes                 | —                                    |
| 2   | Catalog            | Data 1                       | Per-media browse/search/filter, add to library      | 1b search (filters later)            |
| 3   | Library            | Data 4 (ratings, highlights) | Status, progress, ratings, auth                     | theme, shell, 1i, 1c, 1a/1h Continue |
| 4   | Imports            | Data 3                       | File + OAuth importers, match review                | 1g, sync nudge on 1a                 |
| 5   | Series & orders    | LLM "reading order", as data | Author page, named orderings                        | 1d, "Part of" on 1c, sagas on 1a     |
| 6   | Community catalog  | Data 2                       | Create works + creators, dedupe, history            | 1j, community label on 1b            |
| 7   | Groups & links     | Data 4 (link/group)          | Cross-media groups, related-from-groups             | "Related" on 1c, groups on 1a        |
| 8   | Recommendations v1 | Data 4 (ask)                 | Deterministic ranker, "ask" with filters            | 1b filters, 1a suggestions           |
| 9   | LLM recommender    | LLM 1 + 2                    | Profile tool, clarifying question, citations, evals | 1e, 1k                               |
| 10  | Journey            | LLM 2 (roadmap)              | Threads-over-time map, road ahead                   | 1f                                   |

Each phase ends usable. Phase 2 is the first a human can use; Phase 4 the first that saves real time.

## Screens v1

`docs/design/SCREENS.md` is the visual baseline: tokens, type, and a screen inventory with the
phase each one needs. Each phase builds its screens to that baseline. No phase is only design work.

**Before the LLM**: everything except Ask (1e, 1k). The theme, fonts, shell, library, title
detail and the first For you go at the end of Phase 3 (BACKLOG 3.20–3.26), because they style what
Phase 3 already stores. Building them later would mean restyling pages twice.

**Journey could move before Phase 9.** Its threads come from entries and orderings (Phases 3 and 5).
Only the last column, "road ahead", uses suggestions, and the deterministic ranker (8) can fill it
first. Proposed, not decided: swap 9 and 10, then give the road ahead model phrasing in 9.

## Future phases (proposed, not scheduled)

- **Release radar** — notify when a followed saga, creator or series gets a new entry.
- **Where to watch / read / listen** — availability per region (TMDB providers, attribution).
- **Social** — follow people, public profile, shareable lists, recommendations _to_ a friend.
- **More media** — podcasts, video games (IGDB), comics/manga/anime (AniList), audiobooks.
- **Stats & year-in-review** — the append-only entries make this nearly free.
- **Native app** (Expo) reusing `packages/domain` + `contracts`; needs `apps/api` extracted.
- **Offline PWA** — library readable and loggable without network, sync on reconnect.
- **Taste profile export** — give the user their own profile JSON (also what the LLM tool returns).

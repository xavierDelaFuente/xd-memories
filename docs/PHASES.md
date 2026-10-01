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

| # | Phase | Brief origin | Ships |
|---|---|---|---|
| 0 | Repo & gate | — | CI, preview deploys, one green E2E |
| 1 | Domain core | — | Pure types + rules, in-memory fakes |
| 2 | Catalog | Data 1 | Per-media browse/search/filter, add to library |
| 3 | Library | Data 4 (ratings, highlights) | Status, progress, ratings, auth |
| 4 | Imports | Data 3 | File + OAuth importers, match review |
| 5 | Series & orders | LLM "reading order", as data | Author page, named orderings |
| 6 | Community catalog | Data 2 | Create works + creators, dedupe, history |
| 7 | Groups & links | Data 4 (link/group) | Cross-media groups, related-from-groups |
| 8 | Recommendations v1 | Data 4 (ask) | Deterministic ranker, "ask" with filters |
| 9 | LLM recommender | LLM 1 + 2 | Profile tool, clarifying question, citations, evals |
| 10 | Journey | LLM 2 (roadmap) | Threads-over-time map, road ahead |

Each phase ends usable. Phase 2 is the first a human can use; Phase 4 the first that saves real time.

## Future phases (proposed, not scheduled)

- **Release radar** — notify when a followed saga, creator or series gets a new entry.
- **Where to watch / read / listen** — availability per region (TMDB providers, attribution).
- **Social** — follow people, public profile, shareable lists, recommendations *to* a friend.
- **More media** — podcasts, video games (IGDB), comics/manga/anime (AniList), audiobooks.
- **Stats & year-in-review** — the append-only entries make this nearly free.
- **Native app** (Expo) reusing `packages/domain` + `contracts`; needs `apps/api` extracted.
- **Offline PWA** — library readable and loggable without network, sync on reconnect.
- **Taste profile export** — give the user their own profile JSON (also what the LLM tool returns).

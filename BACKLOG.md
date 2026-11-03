# BACKLOG

Each task names its first failing test. `U` = unit, `I` = integration, `E` = E2E.

## Phase 0 — Repo & gate

- 0.1 Create repo, push scaffold, `pnpm add` toolchain at current versions (see README)
- 0.2 Branch protection: PR, 0 approvals (solo — see ALTERNATIVES), up to date, no bypass; checks test · type-check · lint · build
- 0.3 Domain boundary: `E`-less check — CI fails if `packages/domain` imports an I/O package
- 0.4 Walking skeleton (`E`): home page renders "xd-memories" and is reachable by keyboard

## Phase 1 — Domain core

- 1.1 `Entry` (`U`): logging "done" on a work with no entries yields one entry with status done
- 1.2 `Entry` (`U`): a re-read appends a second entry, never mutates the first
- 1.3 `Rating` (`U`): rating outside 0–100 is a typed error; source scales normalise to 0–100 by min–max; views round to whole numbers
- 1.4 `ExternalRef` (`U`): two refs with the same source+id resolve to one `WorkId`
- 1.5 `Ordering` (`U`): user position in a series = highest done position; next = position + 1
- 1.6 `Ordering` (`U`): a series can hold several named orderings without conflict
- 1.7 `Work` (`U`): a blank title is a typed error; media type is one of movie · series · book · album
- 1.8 `Creator` (`U`): a blank name is a typed error
- 1.9 `Credit` (`U`): the same creator credited twice on a work with the same role is one credit; different roles are two

## Phase 2 — Catalog (read-only: search-through, nothing stored)

Movies end to end first; books and music reuse the path.

- 2.1 `CatalogSource` port (`U`): an in-memory catalog returns only items of the requested media type whose title matches the query
- 2.2 TMDB parse (`U`, recorded fixture): a movie search response parses into catalog items with a `tmdb` ref (no IMDb id in search — it comes with the detail page; `sourceVersion` is stored with the raw payload in Phase 3)
- 2.3 TMDB parse (`U`): a malformed payload is a typed error, never a cast; TV results map to `series`
- 2.4 TMDB client (`U`): the request carries the token and the query; `fetch` is injected, no network; failures are typed (UnsupportedMediaType · Unauthorized · RateLimited · RequestRejected · SourceUnavailable · InvalidResponse)
- 2.5 Contracts (`U`): `CatalogSearchQuery` accepts a known media type and a non-blank query
- 2.6 Catalog page (`E`): `/catalog/movies?q=matrix` lists results by keyboard and shows TMDB attribution; E2E uses the fixture adapter
- 2.7 Open Library (`U`, recorded fixture): a search result parses into a book keyed on the work (`works/…`), not the edition (`books/…`); client sends a contact User-Agent; same typed failures as TMDB
- 2.8 Rate limiter (`U`): given the last request time (or none) and `now`, the ms to wait to stay under 1 req/s; interval configurable; a clock that moved back waits one interval, never more
- 2.9 MusicBrainz (`U`, recorded fixture): a release-group search parses into an album keyed on the release group (`release-group/<MBID>`); the query is escaped and limited to primary type Album; the client stays under 1 req/s via `waitBeforeNextRequest` (clock and sleep injected); same typed failures as TMDB
- 2.10 Source health (live, scheduled): a daily GitHub Action runs each adapter against its live API and expects a known title (The Matrix · Breaking Bad · Dune · OK Computer); one retry for SourceUnavailable/RateLimited; not a PR check

## Phase 3 — Library (Neon + Better Auth, RLS)

Integration tests (`I`) run against Postgres in Testcontainers — Docker must be running locally; CI runners have it.

- 3.1 Migrations (`I`): migrations apply to an empty Postgres and running them twice changes nothing; `works` + `external_refs` (one row per source + external id)
- 3.2 RLS harness (`I`): `withUser(db, userId, fn)` runs `fn` in one transaction as `app_user` (`set local role`; owns nothing, so RLS applies; no DDL) with `app.user_id()` set; both end with the transaction; a user sees only own rows and cannot write rows for others; `packages/db` exports no way to query outside `withUser`
- 3.3a Auth storage (`I`): `0003-auth` matches what Better Auth expects (its migration planner finds nothing to create, add or fix); email + password sign-up and sign-in work; passwords stored hashed; `app_user` cannot read any auth table
- 3.3b Sign up / sign in (`E`): `/sign-up` and `/sign-in` pages; a wrong password shows an error; signed out, `/library` redirects to sign-in; E2E runs against Postgres from `compose.yaml`, locally and in CI
- 3.4 Cache-on-save (`I`): the first save of a catalog item stores the work, its ref, the raw source payload and `sourceVersion`; a later save of the same ref, by anyone, reuses that `WorkId`
- 3.5 Library entries + RLS (`I`): user A can neither read nor write user B's entries — the multi-tenancy test
- 3.6 Add to library (`E`): from a search result, "Add" with a status (want · doing · done); `/library` lists it; works are shared by every user, so the saved item comes from the server (re-fetched or signed), never as posted by the browser
- 3.7 Status history (`I`): changing status appends an entry (`logStatus`); the library shows the latest
- 3.8 Rating (`E`): personal 0–100 input, shown rounded; kept apart from source ratings
- 3.9 Highlight (`I`): a highlight is visible to other signed-in users; everything else in a library stays private
- 3.10 Progress (`E`): a series records the season reached (Open Question 2: season, episode optional later)
- 3.11 Secrets (`I`): the built client bundle contains none of the server secret values
- 3.12 Demo (`E`): "Try the demo" signs in to a seeded, read-only demo library — the showcase path for visitors
- 3.13 Email verification + password reset (`I`): before anyone else signs up; Gmail SMTP (app password, €0) behind a `Mailer` port, so Resend + a domain can replace it

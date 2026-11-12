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
- 3.14 Design system (`E`): `@asnewyla/*` with the terra theme set on `<html>` in the server-rendered layout, so the first paint is themed; a page shell on design tokens; the auth pages and home styled; submit buttons full width on a phone, their own width on wider screens
- 3.15 Light / dark (`E`): System · Light · Dark at the right of the header, a site-wide setting rather than part of a page; the choice is a cookie the layout reads, so it holds on every page and visit with no flash, and works before JavaScript loads; System drops the cookie
- 3.16 Header navigation (`E`): next to the colour-scheme choice, the app name, Catalog and Library links (Sign in when signed out), the current page marked (`aria-current`); collapses on a phone without hiding a link
- 3.17 Library page styled (`E`): one card per work; the status a toggle group (one tap, works without JavaScript; the current status does not submit, so a stray tap logs nothing), season and rating as labelled number fields, highlight as a button; its E2E tests keep their names
- 3.18 Catalog styled (`E`): search field, media choice and results as a list with the Add control; empty state readable; the search error and the Add control's messages as `Alert`
- 3.19 Profile styled (`E`): `/people/[id]` highlights styled like the library entries

### Screens v1 baseline

The look of `docs/design/SCREENS.md` (`screens-v1.html`), for the screens Phase 3 data can fill.
Later screens arrive with their phase (see `docs/PHASES.md` → Screens); nothing here waits for the LLM.

- 3.20 Screens v1 theme (`E`): the SCREENS.md tokens as a theme in `@asnewyla/theme` (light + derived dark), set on `<html>` in place of terra; text and control pairs pass WCAG AA in both schemes; existing E2E tests pass unchanged
- 3.21 Fonts (`E`): Newsreader, Geist and Geist Mono self-hosted through `next/font` (no font CDN request at runtime, no layout shift); page and work titles serif, counts · years · sources mono
- 3.22 Media dot (`U`): each media type maps to its dot colour and a text label; no type renders a dot without its label
- 3.23 App shell (`E`): desktop sidebar (wordmark, For you · Library, Movies · Series · Books · Music into the catalog) and a mobile bottom tab bar; only shipped sections appear (Journey, Ask, Sync arrive with their phases); current section `aria-current`; colour scheme and sign-in stay reachable; the 3.16 E2E tests keep their names
- 3.24 Library as screen 1i (`E`): media chips and status tabs with counts; each row shows its dot, title, metadata, rating and highlight
- 3.25 Title detail (`E`): `/works/[id]` as screen 1c: cover, sources with attribution, status toggle, rating, dates from the entries, highlight; "Part of" (Phase 5) and "Related" (Phase 7) absent until then, not empty
- 3.26 For you, first cut (`E`): signed-in home shows Continue (works in progress, latest entry first) as screen 1a/1h; sections from later phases absent, not empty

## Phase 4 — Imports (job queue + worker, file importers, match review)

One importer end to end first (Goodreads: ISBNs make matching checkable), then the others reuse the
path. Every import: file → raw rows stored → parsed → matched by the worker → applied or reviewed.
Never a platform password (PROJECT: Platform sync). Fixtures are synthetic files with each
platform's real header and shape — never a real person's export.
The upload, import and review pages (4.8, 4.9) follow screen 1g; the sync nudge on For you (1a) lands with 4.8.

- 4.1 Match score (`U`): pure, in domain: an identical external id (such as an ISBN's work) is a sure match; otherwise title (case, accents, punctuation and a leading "The" ignored), creator and year each add to a 0–1 score; `decide` gives matched (one candidate over the threshold, clear of the next) · review (close or weak candidates) · unmatched (none)
- 4.2 Goodreads parse (`U`, synthetic fixture): a library export parses into rows: shelf to-read · currently-reading · read → want · doing · done (custom shelves ignored); My Rating 1–5 → 0–100 (1.3), 0 = unrated; Date Added and Date Read → entry dates; ISBNs unwrapped from `="…"`; a file without the Goodreads header is a typed error
- 4.3 Open Library by ISBN (`U`, recorded fixture): an ISBN resolves through its edition to the work (`works/…`), so the row matches the ref search already saves; an unknown ISBN is NotFound; same typed failures as 2.7
- 4.4 Job queue (`I`): a `jobs` table; a worker claims one job at a time (`for update skip locked`), so two workers never run the same job; a claimed job left unfinished for 15 min can be claimed again; a failing job records its error and stops after 3 attempts; a done job never runs again
- 4.5 Import storage + RLS (`I`): `imports` (platform, file SHA-256, state) and `import_rows` (raw row, parsed row, match state, candidates, chosen work); uploading the same file twice is one import; user A can neither read nor write B's imports; the read-only demo cannot import
- 4.6 Worker matches an import (`I`): `apps/worker` drains a match job: each pending row gets candidates from the catalog source (fake in tests), a score (4.1) and a state; resumable — stopped half-way and run again, it continues without re-querying matched rows; stays within each source's rate limit (2.8)
- 4.7 Apply (`I`): applying a matched row saves the work (3.4) and logs its history (want at Date Added, done at Date Read) and rating; applying it again adds nothing (each entry references its import row, unique)
- 4.8 Upload (`E`): `/import` → Goodreads → upload the CSV → "Matching 3 books: this can take a few minutes" → the import page fills in; over 5 MB or not a CSV is refused with a message; the job starts through a `JobRunner` port — GitHub `workflow_dispatch` in production, in-process for dev and E2E
- 4.9 Review (`E`): the import page summarises "N added · N to review · N not found"; a row to review shows its candidates, pick one or skip; a not-found row can be searched by hand (the catalog search); nothing is applied until matched or picked
- 4.10 Delete an import (`I`): deleting an import removes its file record and raw rows; entries already applied stay in the library
- 4.11 Letterboxd (`U`, synthetic fixture): an export ZIP's diary, watched and ratings files → movies; each diary line is a done entry (a re-watch is a second one); half stars 0.5–5 → 0–100; a ZIP entry over 5 MB unpacked is refused; matched by TMDB search on title + year
- 4.12 Netflix (`U`, synthetic fixture): viewing activity rows "Title: Season 2: Episode" → a series, doing, at the highest season seen; rows without a season → a movie, done; a title in another language than the catalog's goes to review
- 4.13 Spotify (`U`, synthetic fixture): extended streaming history JSON → albums by artist + album; an album counts as heard once enough distinct tracks played (Open Question 10); matched by MusicBrainz search on artist + album
- 4.14 Deezer (`U`, synthetic fixture): the personal-data export (requested from Deezer, an Excel file) → its listening history → albums by the 4.13 rule; matched by MusicBrainz search on artist + album; the format is undocumented, so sheet and column names are read from a real export before the fixture is written; an .xlsx is a ZIP, so the 4.11 unpacked-size limit applies
- 4.15 Last.fm (`U`, recorded fixture): a username's scrobbles, paged, → the same album rule as 4.13; the API key stays on the server; added to the source-health check (2.10)
- 4.16 Trakt (`I`): OAuth connect; the token stored encrypted, never shown; history → movies and series by their TMDB ids (exact matches, no review); disconnecting deletes the token

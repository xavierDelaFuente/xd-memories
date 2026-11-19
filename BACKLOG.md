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
- 3.18 Catalog styled (`E`): the media as links styled like tabs (the current one marked; switching keeps the query); the search field and its button on one row; one card per result; Add in one tap, a button per status (no select); empty state readable; the search error and the Add control's messages as `Alert`
- 3.19 Profile styled (`E`): `/people/[id]` highlights styled like the library entries

### Screens v1 baseline

The look of `docs/design/SCREENS.md` (`screens-v1.html`), for the screens Phase 3 data can fill.
Later screens arrive with their phase (see `docs/PHASES.md` → Screens); nothing here waits for the LLM.

- 3.20 Screens v1 theme (`E`): the SCREENS.md tokens as a theme in `@asnewyla/theme` (light + derived dark), set on `<html>` in place of terra; text and control pairs pass WCAG AA in both schemes; existing E2E tests pass unchanged
- 3.21 Fonts (`E`): Newsreader, Geist and Geist Mono self-hosted through `next/font` from npm packages (no font CDN request at runtime or at build; fallbacks sized to each font, so no layout shift); page and work titles serif, the wordmark serif italic; Geist Mono is the mono font, applied to counts · years · sources once rows show them apart from the title (3.24, 3.25)
- 3.22 Media dot (`U`): each media type maps to its dot colour and a text label; no type renders a dot without its label; `doing` reads per media (Reading · Watching · Listening) where one media is shown, "In progress" where they're mixed
- 3.23 App shell (`E`): from 64rem a sidebar (wordmark, For you · Library — Sign in when signed out —, the media as "Browse": Movies · Series · Books · Music from `mediaLinks`, the colour scheme at its foot; 240px, as terra's spacing needs it for the three scheme buttons); on a phone a top bar (wordmark, colour scheme) and a bottom tab bar (For you · Browse · Library, 48px targets), the catalog's media as chips; switching media keeps the query in both; only shipped sections appear (Journey, Ask, Sync arrive with their phases); current section `aria-current`; "Albums" relabelled "Music" (Open Question 13); For you leads to `/` until 3.26; the 3.16 and 3.18 E2E tests keep their names
- 3.24 Library as screen 1i (`E`): the media as chips (All · Movies · Series · Books · Music, everywhere, scrolling sideways in place on a narrow phone) and the statuses as tabs with counts (Active · Want · Done · Dropped, counted within the media shown; "doing" reads Active across media and its verb within one, Reading for books); the choice is in the URL (`/library?media=books&status=want`), and with no status asked for the first tab with works in it opens; each row shows the title (serif), its dot, media · creator · year (· season), and the rating (mono) and Highlighted at its end; status, season, rating and highlight fold under "Edit" until the title page takes them (3.25), the history under "History"; covers come with 3.25; "read 2×" waits on logging re-reads
- 3.25 Covers (`U` + `I` + `E`; the title page split off as 3.28): `CatalogItem` gains `cover`, an https URL on the source's own host or `null`: TMDB poster (`w342`), Open Library by cover id (`-M`, now requested in `fields`; fixture re-recorded), Cover Art Archive's release-group front (search can't say whether one exists, so an album always has a URL that may not load); the signed item carries it and the contract takes https only; `works.cover` (migration 0011, checked https) stored on first save and read by `libraryOf`; works saved earlier have none until a refresh, except the demo's, which the seed fills in; covers load straight from the source (lazy, no referrer; not proxied, so no image-optimisation quota), with a striped placeholder of the same shape where there's none or it fails to load, before or after hydration; results become a cover grid (1b) with title and creator · year, keeping the one-tap Add group (3.18); library rows show a thumbnail (1i)
- 3.26 For you, first cut (`E`): signed-in home shows Continue (works in progress, latest entry first) as screen 1a/1h; sections from later phases absent, not empty; each card: cover, media, title linking to its page, the season if any and "Reading since …" (no progress bar: pages and episodes aren't recorded); nothing in progress points to Browse; signed out, home is unchanged
- 3.27 Dropped status (`U` + `I` + `E`, before 3.24): `dropped` after want · doing · done in the domain, the contracts and the `entries` check (migration 0010); the library offers it, the catalog's Add doesn't (nothing starts out given up on); a dropped work can be picked up again, the history keeping both
- 3.28 Title detail (`I` + `E`, split from 3.25): `/works/[id]` as screen 1c, for a work in your library (any other id is not found; signed out, sign in): a breadcrumb back to the library at its media, the cover, its sources each named and linked to the work's page on the source's site (appended to a fixed https origin, so an id can't lead elsewhere; TMDB's credit where TMDB is a source), media · year · season, the title, "by" its creators; then your entry: the status toggle, rating, season for a series, highlight, the dates ("Started … · finished …" of the latest go, from the entries) and the full history; `workOf` reads it all under row level security; library rows link to it by title, and the row's Edit and History (3.24) move there; the demo's page shows the entry without controls; "Part of" (Phase 5) and "Related" (Phase 7) absent until then, not empty; the design's 5-square rating and "1st read" wait on a rating scale and on logging re-reads
- 3.29 In your library, on results (`I` + `E`): a search result already in your library shows its status and links to its title page (1b), in place of Add; matched by source and id (`statusesOf`), the latest status, your own entries only

### Production

Real accounts, invite-only at first, before Phase 4: the worker runs against the production
database anyway, and real libraries show which importer matters. These come first because real
people's data is at stake; 3.36 is the switch. Every step on a website (Neon, Vercel, GitHub
settings) is a checklist naming variables, never their values.

- 3.30 Delete account (`I` + `E`): from an account page, deleting asks for the password and removes the user, their sessions, entries, ratings, progress and highlights; shared works and their refs stay (the catalog isn't theirs); afterwards signing in with it fails and their profile is not found; the demo account can't be deleted; first failing test: after `deleteAccount`, no row of any user-owned table names the user
- 3.31 Privacy note (`E`): `/privacy`, linked from sign-up and the shell: what is stored (email, name, library), who sees what (highlights: any signed-in user; the rest: no one), that email is sent through Gmail, that covers load from the sources' hosts (they see the visitor's IP), how to delete your account (3.30); sign-up links to it before the button
- 3.32 Migrate on deploy (CI): on merge to main a GitHub Action (environment `production`, secret `DATABASE_URL`) runs the migrations, then triggers Vercel's production deploy through a deploy hook; a failed migration stops the deploy; Vercel no longer deploys production on its own (previews still do); migrations stay additive within a release (expand, then contract later), since the old version runs against the new schema while the new one deploys
- 3.33 Previews off production data (chore): in Vercel, the production `DATABASE_URL` and `BETTER_AUTH_SECRET` are scoped to Production only; previews get a Neon branch per PR (Neon's Vercel integration) or no database, so no preview can read or write real accounts; checked by opening a preview and confirming the demo and sign-up use the branch
- 3.34 Sign-in rate limit (`I`): repeated failed sign-ins, sign-ups and reset requests are refused (429) after a few in a window, counted in Postgres (Better Auth's database storage), not per server instance in memory, so it holds on Vercel; first failing test: the 6th wrong password for one email within a minute is refused even when the right one is given
- 3.35 Production config check (`U`): in production the app refuses to start with a required variable missing (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` on https, `TMDB_API_TOKEN`, `MUSICBRAINZ_USER_AGENT`, the SMTP settings) or with `CATALOG_SOURCE=fixtures`; the error names the variable, never its value
- 3.36 Go live (chore): Neon production branch; Vercel Production variables; GitHub `production` environment; migrate (3.32); seed the demo once; smoke test by hand: sign up with a real address (the mail arrives, check spam), add, rate, highlight, delete the account; share the URL with a few people, no announcement; the known limits written into PROJECT.md: Gmail sends about 500 a day and may land in spam without a domain, Neon Free keeps only a short restore window (no long-term backups), Vercel Hobby is non-commercial
- 3.37 Close Phase 3 (docs): PROJECT.md's Current State brought up to date (it still reads "Phase 3 BACKLOG written"), Phase 3 ticked with 3.20 carried over while it waits on `@asnewyla/theme`, Next: Phase 4

### Follow-ups

Found along the way; none blocks going live.

- 3.38 Header at 320px (`E`): on a 320px-wide phone the top bar (wordmark and the three colour-scheme buttons) stays on one line, with no sideways scroll
- 3.39 Re-reads counted (`U` + `E`): a done after an earlier done is a re-read; the library row shows "read 2×" (1i) and the work page "2nd read" (1c), worded per media (watched, listened)
- 3.40 Rating input as in 1c (`E`): five squares in place of the 0–100 field, once Open Question 14 is decided; stored 0–100 either way

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
- 4.17 Work refresh (`I`): a worker job re-reads cached works from their source, within each source's rate limit, and fills in what the first save lacked (a cover, creators, a year) without overwriting what's there; works saved before covers (3.25) gain theirs; run on demand, like the other jobs

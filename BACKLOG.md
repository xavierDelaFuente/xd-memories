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
- 2.8 Rate limiter (`U`): given the last request time and `now`, the wait needed to stay under 1 req/s
- 2.9 MusicBrainz parse (`U`, recorded fixture): a release-group search parses into an album `Work` + `ExternalRef`

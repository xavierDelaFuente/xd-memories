# Data sources

Read the terms before Phase 2 (CODEX: External data). Everything below needs re-checking then —
terms and limits change. Store raw payload + source version for every fetched record.

## Catalog

| Media | Primary | Fallback / extra | Notes |
|---|---|---|---|
| Movies, series | TMDB API | Wikidata | Free, non-commercial, attribution required. Returns IMDb ids |
| Books | Open Library API | Google Books API, Wikidata (series ordinals) | Open Library: no key, be polite. Editions vs works matter |
| Music | MusicBrainz | Cover Art Archive, Wikidata | 1 req/s, descriptive User-Agent required. Release group = album |
| Reading order | Wikidata (part of series + series ordinal) | community orderings | Coverage is uneven — community orderings fill gaps |

Not used: IMDb (no free API; datasets are personal/non-commercial), scraping any site.
Candidate to evaluate: Hardcover API (book series positions) — check terms and stability first.

## Import (Phase 4)

| Platform | Method | Notes |
|---|---|---|
| Netflix | File — viewing activity CSV | Rows are "Show: Season: Episode" strings → matching |
| Spotify | OAuth (recent plays only) + file (extended streaming history via data request) | API history is shallow; the file is the real history |
| Goodreads | File — library export CSV | Public API closed to new keys |
| Letterboxd | File — account export ZIP | |
| Trakt | OAuth API | Already aggregates many platforms |
| Last.fm | API (username + key) | Full scrobble history |
| Prime Video, Apple Music, Kindle | Personal-data request only | Guide the user; parse when the file arrives |

Rule: never ask for a platform password. Every importer: raw rows stored → parsed → matched →
review queue. Re-running an import is idempotent.

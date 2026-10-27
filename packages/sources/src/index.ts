// One adapter per external source (tmdb/, openlibrary/, musicbrainz/, wikidata/, importers/).
// External shapes never leave this package; adapters parse into domain types.

export { createTmdbCatalog, type TmdbOptions } from './tmdb/client';

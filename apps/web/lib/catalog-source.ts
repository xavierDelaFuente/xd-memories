import {
  type CatalogItem,
  type CatalogSource,
  catalogByMediaType,
  inMemoryCatalog,
} from '@xd-memories/domain';
import { createOpenLibraryCatalog, createTmdbCatalog } from '@xd-memories/sources';

const fixture = (externalId: string, mediaType: CatalogItem['mediaType'], title: string) => ({
  ref: { source: 'fixture', externalId },
  mediaType,
  title,
});

const FIXTURES: CatalogItem[] = [
  fixture('m1', 'movie', 'The Matrix'),
  fixture('m2', 'movie', 'The Matrix Reloaded'),
  fixture('m3', 'movie', 'Dune'),
  fixture('s1', 'series', 'The Animatrix'),
  fixture('b1', 'book', 'Dune'),
  fixture('b2', 'book', 'Dune Messiah'),
];

// CATALOG_SOURCE=fixtures keeps E2E off the network (CODEX: no test touches the network).
export function catalogSource(): CatalogSource {
  if (process.env.CATALOG_SOURCE === 'fixtures') return inMemoryCatalog(FIXTURES);
  const tmdb = createTmdbCatalog({ token: process.env.TMDB_API_TOKEN ?? '', fetch });
  const openLibrary = createOpenLibraryCatalog({
    userAgent: process.env.MUSICBRAINZ_USER_AGENT ?? 'xd-memories',
    fetch,
  });
  return catalogByMediaType({ movie: tmdb, series: tmdb, book: openLibrary });
}

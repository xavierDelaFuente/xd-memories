import { type CatalogItem, type CatalogSource, inMemoryCatalog } from '@xd-memories/domain';
import { createTmdbCatalog } from '@xd-memories/sources';

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
];

// CATALOG_SOURCE=fixtures keeps E2E off the network (CODEX: no test touches the network).
export function catalogSource(): CatalogSource {
  if (process.env.CATALOG_SOURCE === 'fixtures') return inMemoryCatalog(FIXTURES);
  return createTmdbCatalog({ token: process.env.TMDB_API_TOKEN ?? '', fetch });
}

import {
  type CatalogItem,
  type CatalogSource,
  catalogByMediaType,
  inMemoryCatalog,
} from '@xd-memories/domain';
import {
  createMusicBrainzCatalog,
  createOpenLibraryCatalog,
  createTmdbCatalog,
} from '@xd-memories/sources';

const fixture = (
  externalId: string,
  mediaType: CatalogItem['mediaType'],
  title: string,
  year: number,
  creators: string[] = [],
): CatalogItem => ({ ref: { source: 'fixture', externalId }, mediaType, title, creators, year });

const FIXTURES: CatalogItem[] = [
  fixture('m1', 'movie', 'The Matrix', 1999),
  fixture('m2', 'movie', 'The Matrix Reloaded', 2003),
  fixture('m3', 'movie', 'Dune', 2021),
  fixture('m4', 'movie', 'Computer Chess', 2013),
  fixture('s1', 'series', 'The Animatrix', 2003),
  fixture('b1', 'book', 'Dune', 1965, ['Frank Herbert']),
  fixture('b2', 'book', 'Dune Messiah', 1969, ['Frank Herbert']),
  fixture('a1', 'album', 'OK Computer', 1997, ['Radiohead']),
];

const userAgent = process.env.MUSICBRAINZ_USER_AGENT ?? 'xd-memories';

function liveCatalog(): CatalogSource {
  const tmdb = createTmdbCatalog({ token: process.env.TMDB_API_TOKEN ?? '', fetch });
  return catalogByMediaType({
    movie: tmdb,
    series: tmdb,
    book: createOpenLibraryCatalog({ userAgent, fetch }),
    album: createMusicBrainzCatalog({
      userAgent,
      fetch,
      clock: () => new Date(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    }),
  });
}

// One live catalog per server process: the MusicBrainz rate limiter remembers its last request.
let live: CatalogSource | undefined;

// CATALOG_SOURCE=fixtures keeps E2E off the network (CODEX: no test touches the network).
export function catalogSource(): CatalogSource {
  if (process.env.CATALOG_SOURCE === 'fixtures') return inMemoryCatalog(FIXTURES);
  live ??= liveCatalog();
  return live;
}

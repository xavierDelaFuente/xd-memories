import { type CatalogSource, inMemoryCatalog, type SourceError } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { messageFor, searchCatalog } from '../catalog-search';

const matrix = {
  ref: { source: 'fixture', externalId: 'm1' },
  mediaType: 'movie' as const,
  title: 'The Matrix',
};
const animatrix = {
  ref: { source: 'fixture', externalId: 's1' },
  mediaType: 'series' as const,
  title: 'The Animatrix',
};
const catalog = inMemoryCatalog([matrix, animatrix]);

const failing = (error: SourceError): CatalogSource => ({
  search: async () => ({ ok: false, error }),
});

describe('searchCatalog', () => {
  it.each([
    ['movies', 'movie'],
    ['series', 'series'],
    ['books', 'book'],
    ['albums', 'album'],
  ])('the URL segment %s searches %s', async (media, mediaType) => {
    expect(await searchCatalog({ media, q: undefined }, catalog)).toEqual({
      kind: 'idle',
      mediaType,
    });
  });

  it.each(['podcasts', 'movie', 'Movies', '', 'toString', 'constructor'])(
    'an unknown segment %j is not found',
    async (media) => {
      expect(await searchCatalog({ media, q: 'matrix' }, catalog)).toEqual({ kind: 'not-found' });
    },
  );

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
  ])('a %s query shows the empty search form, not an error', async (_case, q) => {
    expect(await searchCatalog({ media: 'movies', q }, catalog)).toEqual({
      kind: 'idle',
      mediaType: 'movie',
    });
  });

  it('returns the matching items with the trimmed query', async () => {
    expect(await searchCatalog({ media: 'movies', q: ' matrix ' }, catalog)).toEqual({
      kind: 'results',
      mediaType: 'movie',
      query: 'matrix',
      items: [matrix],
    });
  });

  it('a repeated q parameter uses the first value', async () => {
    const view = await searchCatalog({ media: 'series', q: ['animatrix', 'dune'] }, catalog);

    expect(view.kind === 'results' && view.query).toBe('animatrix');
  });

  it('a source failure becomes an error view that keeps the query', async () => {
    const view = await searchCatalog(
      { media: 'movies', q: 'matrix' },
      failing({ kind: 'SourceUnavailable' }),
    );

    expect(view).toEqual({
      kind: 'error',
      mediaType: 'movie',
      query: 'matrix',
      error: { kind: 'SourceUnavailable' },
    });
  });
});

describe('messageFor', () => {
  it.each<[SourceError, string]>([
    [{ kind: 'UnsupportedMediaType', mediaType: 'book' }, 'Searching books is not available yet.'],
    [{ kind: 'RateLimited', retryAfterSeconds: 10 }, 'Too many searches. Try again in 10 seconds.'],
    [{ kind: 'RateLimited', retryAfterSeconds: null }, 'Too many searches. Try again shortly.'],
    [{ kind: 'SourceUnavailable' }, 'The catalog is not responding. Try again in a moment.'],
    [{ kind: 'Unauthorized' }, 'Search is not working right now. The problem is on our side.'],
    [
      { kind: 'RequestRejected', status: 404 },
      'Search is not working right now. The problem is on our side.',
    ],
    [
      { kind: 'InvalidResponse', detail: 'x' },
      'Search is not working right now. The problem is on our side.',
    ],
  ])('%o reads: %s', (error, message) => {
    expect(messageFor(error)).toBe(message);
  });
});

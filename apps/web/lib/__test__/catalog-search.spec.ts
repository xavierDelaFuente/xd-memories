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
  it.each`
    media       | mediaType
    ${'movies'} | ${'movie'}
    ${'series'} | ${'series'}
    ${'books'}  | ${'book'}
    ${'albums'} | ${'album'}
  `(
    'the URL segment $media searches $mediaType',
    async ({ media, mediaType }: { media: string; mediaType: string }) => {
      const search = await searchCatalog({ media, q: undefined }, catalog);

      expect(search).toEqual({ kind: 'idle', mediaType });
    },
  );

  it.each(['podcasts', 'movie', 'Movies', '', 'toString', 'constructor'])(
    'an unknown segment %j is not found',
    async (media) => {
      const search = await searchCatalog({ media, q: 'matrix' }, catalog);

      expect(search).toEqual({ kind: 'not-found' });
    },
  );

  it.each`
    case         | q
    ${'missing'} | ${undefined}
    ${'empty'}   | ${''}
    ${'blank'}   | ${'   '}
  `(
    'a $case query shows the empty search form, not an error',
    async ({ q }: { q: string | undefined }) => {
      const search = await searchCatalog({ media: 'movies', q }, catalog);

      expect(search).toEqual({ kind: 'idle', mediaType: 'movie' });
    },
  );

  it('returns the matching items with the trimmed query', async () => {
    const search = await searchCatalog({ media: 'movies', q: ' matrix ' }, catalog);

    expect(search).toEqual({
      kind: 'results',
      mediaType: 'movie',
      query: 'matrix',
      items: [matrix],
    });
  });

  it('a repeated q parameter uses the first value', async () => {
    const search = await searchCatalog({ media: 'series', q: ['animatrix', 'dune'] }, catalog);

    expect(search).toMatchObject({ kind: 'results', query: 'animatrix' });
  });

  it('a source failure becomes an error view that keeps the query', async () => {
    const search = await searchCatalog(
      { media: 'movies', q: 'matrix' },
      failing({ kind: 'SourceUnavailable' }),
    );

    expect(search).toEqual({
      kind: 'error',
      mediaType: 'movie',
      query: 'matrix',
      error: { kind: 'SourceUnavailable' },
    });
  });
});

describe('messageFor', () => {
  const ourSide = 'Search is not working right now. The problem is on our side.';

  it.each`
    kind                      | details                        | message
    ${'UnsupportedMediaType'} | ${{ mediaType: 'book' }}       | ${'Searching books is not available yet.'}
    ${'RateLimited'}          | ${{ retryAfterSeconds: 10 }}   | ${'Too many searches. Try again in 10 seconds.'}
    ${'RateLimited'}          | ${{ retryAfterSeconds: null }} | ${'Too many searches. Try again shortly.'}
    ${'SourceUnavailable'}    | ${{}}                          | ${'The catalog is not responding. Try again in a moment.'}
    ${'Unauthorized'}         | ${{}}                          | ${ourSide}
    ${'RequestRejected'}      | ${{ status: 404 }}             | ${ourSide}
    ${'InvalidResponse'}      | ${{ detail: 'x' }}             | ${ourSide}
  `(
    '$kind $details reads: $message',
    ({
      kind,
      details,
      message,
    }: {
      kind: SourceError['kind'];
      details: object;
      message: string;
    }) => {
      const error = { kind, ...details } as SourceError;

      const text = messageFor(error);

      expect(text).toBe(message);
    },
  );
});

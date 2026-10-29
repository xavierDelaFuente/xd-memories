import type { CatalogQuery } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { unwrap } from '../../__test__/helpers';
import { createTmdbCatalog } from '../client';
import movieSearch from '../fixtures/search-movie-matrix.json' with { type: 'json' };
import tvSearch from '../fixtures/search-tv-matrix.json' with { type: 'json' };

type Call = { url: URL; headers: Headers };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const searchWith = async (
  response: Response,
  query: CatalogQuery = { mediaType: 'movie', query: 'matrix' },
) => {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), headers: new Headers(init?.headers) });
    return response;
  };
  const result = await createTmdbCatalog({ token: 'secret-token', fetch }).search(query);
  return { calls, result };
};

describe('the request', () => {
  it('makes exactly one call', async () => {
    const { calls } = await searchWith(json(movieSearch));

    expect(calls).toHaveLength(1);
  });

  it.each`
    mediaType   | endpoint
    ${'movie'}  | ${'https://api.themoviedb.org/3/search/movie'}
    ${'series'} | ${'https://api.themoviedb.org/3/search/tv'}
  `(
    '$mediaType searches $endpoint',
    async ({ mediaType, endpoint }: { mediaType: 'movie' | 'series'; endpoint: string }) => {
      const { calls } = await searchWith(json({ results: [] }), { mediaType, query: 'm' });

      expect(`${calls[0]?.url.origin}${calls[0]?.url.pathname}`).toBe(endpoint);
    },
  );

  it('carries the token as a Bearer header', async () => {
    const { calls } = await searchWith(json(movieSearch));

    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer secret-token');
  });

  it('encodes the query safely', async () => {
    const { calls } = await searchWith(json({ results: [] }), {
      mediaType: 'movie',
      query: 'star wars & co?',
    });

    expect(calls[0]?.url.searchParams.get('query')).toBe('star wars & co?');
  });

  it.each(['book', 'album'] as const)('%s never calls TMDB', async (mediaType) => {
    const { calls } = await searchWith(json(movieSearch), { mediaType, query: 'm' });

    expect(calls).toHaveLength(0);
  });
});

describe('successful responses', () => {
  it('movie results are parsed into catalog items', async () => {
    const { result } = await searchWith(json(movieSearch));

    expect(unwrap(result)[0]).toMatchObject({ mediaType: 'movie', title: 'The Matrix' });
  });

  it('TV results are parsed into series', async () => {
    const { result } = await searchWith(json(tvSearch), { mediaType: 'series', query: 'm' });

    expect(unwrap(result)[0]).toMatchObject({ mediaType: 'series', title: 'Threat Matrix' });
  });

  it('an empty result list is an empty catalog, not an error', async () => {
    const { result } = await searchWith(json({ page: 1, results: [] }));

    expect(result).toEqual({ ok: true, value: [] });
  });
});

describe('failures are typed errors that say what to fix', () => {
  it.each(['book', 'album'] as const)('%s is UnsupportedMediaType', async (mediaType) => {
    const { result } = await searchWith(json(movieSearch), { mediaType, query: 'm' });

    expect(result).toEqual({ ok: false, error: { kind: 'UnsupportedMediaType', mediaType } });
  });

  it.each`
    status | error
    ${401} | ${{ kind: 'Unauthorized' }}
    ${404} | ${{ kind: 'RequestRejected', status: 404 }}
    ${429} | ${{ kind: 'RateLimited', retryAfterSeconds: null }}
    ${503} | ${{ kind: 'SourceUnavailable' }}
  `('HTTP $status is $error.kind', async ({ status, error }: { status: number; error: object }) => {
    const { result } = await searchWith(json({}, status));

    expect(result).toEqual({ ok: false, error });
  });

  it('a network failure is SourceUnavailable, never a thrown error', async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    const catalog = createTmdbCatalog({ token: 't', fetch });

    const result = await catalog.search({ mediaType: 'movie', query: 'matrix' });

    expect(result).toEqual({ ok: false, error: { kind: 'SourceUnavailable' } });
  });

  it.each`
    case                         | response
    ${'a body that is not JSON'} | ${new Response('<html>oops</html>', { status: 200 })}
    ${'JSON in the wrong shape'} | ${json({ results: 'nope' })}
  `('$case is InvalidResponse', async ({ response }: { response: Response }) => {
    const { result } = await searchWith(response);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'InvalidResponse', detail: expect.any(String) },
    });
  });
});

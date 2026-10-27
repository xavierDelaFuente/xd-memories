import { describe, expect, it } from 'vitest';
import { createTmdbCatalog } from '../client';
import movieSearch from '../fixtures/search-movie-matrix.json' with { type: 'json' };
import tvSearch from '../fixtures/search-tv-matrix.json' with { type: 'json' };

type Call = { url: string; headers: Headers };

const fakeFetch = (respond: (url: string) => Response) => {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, headers: new Headers(init?.headers) });
    return respond(url);
  };
  return { fetch, calls };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createTmdbCatalog', () => {
  it('searches movies with the token and the query, and parses the response', async () => {
    const { fetch, calls } = fakeFetch(() => json(movieSearch));
    const catalog = createTmdbCatalog({ token: 'secret-token', fetch });

    const result = await catalog.search({ mediaType: 'movie', query: 'matrix' });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url ?? '');
    expect(url.origin + url.pathname).toBe('https://api.themoviedb.org/3/search/movie');
    expect(url.searchParams.get('query')).toBe('matrix');
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer secret-token');
    expect(result.ok && result.value[0]?.title).toBe('The Matrix');
  });

  it('searches series on the TV endpoint', async () => {
    const { fetch, calls } = fakeFetch(() => json(tvSearch));
    const catalog = createTmdbCatalog({ token: 't', fetch });

    const result = await catalog.search({ mediaType: 'series', query: 'matrix' });

    expect(new URL(calls[0]?.url ?? '').pathname).toBe('/3/search/tv');
    expect(result.ok && result.value[0]?.mediaType).toBe('series');
  });

  it('encodes the query safely', async () => {
    const { fetch, calls } = fakeFetch(() => json({ results: [] }));
    const catalog = createTmdbCatalog({ token: 't', fetch });

    await catalog.search({ mediaType: 'movie', query: 'star wars & co?' });

    expect(new URL(calls[0]?.url ?? '').searchParams.get('query')).toBe('star wars & co?');
  });

  it.each(['book', 'album'] as const)(
    '%s is UnsupportedMediaType, and TMDB is not called',
    async (mediaType) => {
      const { fetch, calls } = fakeFetch(() => json(movieSearch));
      const catalog = createTmdbCatalog({ token: 't', fetch });

      expect(await catalog.search({ mediaType, query: 'matrix' })).toEqual({
        ok: false,
        error: { kind: 'UnsupportedMediaType', mediaType },
      });
      expect(calls).toHaveLength(0);
    },
  );

  describe('HTTP failures map to errors that say what to fix', () => {
    const searchWith = (response: Response) => {
      const { fetch } = fakeFetch(() => response);
      return createTmdbCatalog({ token: 't', fetch }).search({ mediaType: 'movie', query: 'm' });
    };

    it.each([401, 403])('%i is Unauthorized: check the token', async (status) => {
      expect(await searchWith(json({ status_message: 'Invalid API key' }, status))).toEqual({
        ok: false,
        error: { kind: 'Unauthorized' },
      });
    });

    it.each([400, 402, 404, 422, 428, 430, 499])(
      '%i is RequestRejected: our request is wrong',
      async (status) => {
        expect(await searchWith(json({}, status))).toEqual({
          ok: false,
          error: { kind: 'RequestRejected', status },
        });
      },
    );

    it.each([500, 502, 503, 599])('%i is SourceUnavailable: TMDB is down', async (status) => {
      expect(await searchWith(json({}, status))).toEqual({
        ok: false,
        error: { kind: 'SourceUnavailable' },
      });
    });

    it('the status decides, even when the error body is not JSON', async () => {
      const htmlErrorPage = new Response('<html>Bad gateway</html>', { status: 503 });

      expect(await searchWith(htmlErrorPage)).toEqual({
        ok: false,
        error: { kind: 'SourceUnavailable' },
      });
    });
  });

  describe('429 RateLimited and its Retry-After header', () => {
    const rateLimitedWith = (retryAfter: string | null) => {
      const headers: Record<string, string> =
        retryAfter === null ? {} : { 'Retry-After': retryAfter };
      const { fetch } = fakeFetch(() => new Response('{}', { status: 429, headers }));
      return createTmdbCatalog({ token: 't', fetch }).search({ mediaType: 'movie', query: 'm' });
    };

    it.each([
      ['10', 10],
      ['0', 0],
    ])('Retry-After %j is a wait of %i seconds', async (header, seconds) => {
      expect(await rateLimitedWith(header)).toEqual({
        ok: false,
        error: { kind: 'RateLimited', retryAfterSeconds: seconds },
      });
    });

    it.each([
      ['missing', null],
      ['not a number', 'soon'],
      ['negative', '-5'],
      ['a fraction', '1.5'],
      ['an HTTP date', 'Wed, 21 Oct 2026 07:28:00 GMT'],
      ['empty', ''],
    ])('Retry-After %s is a wait of unknown length (null)', async (_case, header) => {
      expect(await rateLimitedWith(header)).toEqual({
        ok: false,
        error: { kind: 'RateLimited', retryAfterSeconds: null },
      });
    });
  });

  describe('successful responses', () => {
    it('an empty result list is an empty catalog, not an error', async () => {
      const { fetch } = fakeFetch(() => json({ page: 1, results: [] }));
      const catalog = createTmdbCatalog({ token: 't', fetch });

      expect(await catalog.search({ mediaType: 'movie', query: 'zzz' })).toEqual({
        ok: true,
        value: [],
      });
    });

    it('JSON in the wrong shape is InvalidResponse', async () => {
      const { fetch } = fakeFetch(() => json({ results: 'nope' }));
      const catalog = createTmdbCatalog({ token: 't', fetch });

      const result = await catalog.search({ mediaType: 'movie', query: 'matrix' });

      expect(result.ok === false && result.error.kind).toBe('InvalidResponse');
    });
  });

  it('a network failure is SourceUnavailable, never a thrown error', async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    const catalog = createTmdbCatalog({ token: 't', fetch });

    expect(await catalog.search({ mediaType: 'movie', query: 'matrix' })).toEqual({
      ok: false,
      error: { kind: 'SourceUnavailable' },
    });
  });

  it('a body that is not JSON is InvalidResponse', async () => {
    const { fetch } = fakeFetch(() => new Response('<html>oops</html>', { status: 200 }));
    const catalog = createTmdbCatalog({ token: 't', fetch });

    const result = await catalog.search({ mediaType: 'movie', query: 'matrix' });

    expect(result.ok === false && result.error.kind).toBe('InvalidResponse');
  });
});

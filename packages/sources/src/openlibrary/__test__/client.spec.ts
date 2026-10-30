import type { CatalogQuery } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { unwrap } from '../../__test__/helpers';
import { createOpenLibraryCatalog } from '../client';
import bookSearch from '../fixtures/search-dune.json' with { type: 'json' };

type Call = { url: URL; headers: Headers };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const searchWith = async (
  response: Response,
  query: CatalogQuery = { mediaType: 'book', query: 'dune' },
) => {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), headers: new Headers(init?.headers) });
    return response;
  };
  const catalog = createOpenLibraryCatalog({
    userAgent: 'xd-memories/0.0 (me@example.com)',
    fetch,
  });
  const result = await catalog.search(query);
  return { calls, result };
};

describe('the request', () => {
  it('makes exactly one call', async () => {
    const { calls } = await searchWith(json(bookSearch));

    expect(calls).toHaveLength(1);
  });

  it('searches the Open Library search endpoint', async () => {
    const { calls } = await searchWith(json(bookSearch));

    expect(`${calls[0]?.url.origin}${calls[0]?.url.pathname}`).toBe(
      'https://openlibrary.org/search.json',
    );
  });

  it.each`
    param       | value
    ${'q'}      | ${'dune'}
    ${'fields'} | ${'key,title,author_name,first_publish_year'}
    ${'limit'}  | ${'20'}
  `('sends $param=$value', async ({ param, value }: { param: string; value: string }) => {
    const { calls } = await searchWith(json(bookSearch));

    expect(calls[0]?.url.searchParams.get(param)).toBe(value);
  });

  it('identifies itself with a User-Agent, as Open Library asks', async () => {
    const { calls } = await searchWith(json(bookSearch));

    expect(calls[0]?.headers.get('User-Agent')).toBe('xd-memories/0.0 (me@example.com)');
  });

  it('encodes the query safely', async () => {
    const { calls } = await searchWith(json({ docs: [] }), {
      mediaType: 'book',
      query: 'dune & co?',
    });

    expect(calls[0]?.url.searchParams.get('q')).toBe('dune & co?');
  });

  it.each(['movie', 'series', 'album'] as const)(
    '%s never calls Open Library',
    async (mediaType) => {
      const { calls } = await searchWith(json(bookSearch), { mediaType, query: 'dune' });

      expect(calls).toHaveLength(0);
    },
  );
});

describe('successful responses', () => {
  it('docs are parsed into books', async () => {
    const { result } = await searchWith(json(bookSearch));

    expect(unwrap(result)[0]).toMatchObject({ mediaType: 'book', title: 'Dune' });
  });
});

describe('failures are typed errors that say what to fix', () => {
  it.each(['movie', 'series', 'album'] as const)(
    '%s is UnsupportedMediaType',
    async (mediaType) => {
      const { result } = await searchWith(json(bookSearch), { mediaType, query: 'dune' });

      expect(result).toEqual({ ok: false, error: { kind: 'UnsupportedMediaType', mediaType } });
    },
  );

  it.each`
    status | error
    ${403} | ${{ kind: 'Unauthorized' }}
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
    const catalog = createOpenLibraryCatalog({ userAgent: 'ua', fetch });

    const result = await catalog.search({ mediaType: 'book', query: 'dune' });

    expect(result).toEqual({ ok: false, error: { kind: 'SourceUnavailable' } });
  });

  it('a body that is not JSON is InvalidResponse', async () => {
    const { result } = await searchWith(new Response('<html>oops</html>', { status: 200 }));

    expect(result).toEqual({
      ok: false,
      error: { kind: 'InvalidResponse', detail: expect.any(String) },
    });
  });
});

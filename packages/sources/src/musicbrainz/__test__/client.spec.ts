import type { CatalogQuery } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { unwrap } from '../../__test__/helpers';
import { createMusicBrainzCatalog } from '../client';
import albumSearch from '../fixtures/search-ok-computer.json' with { type: 'json' };

type Call = { url: URL; headers: Headers };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const okComputer: CatalogQuery = { mediaType: 'album', query: 'ok computer' };

// A fake clock: sleeping moves time forward, so the client sees what really happens after it waits.
const setup = (respond: () => Response = () => json(albumSearch)) => {
  let time = Date.parse('2026-10-29T12:00:00.000Z');
  const calls: Call[] = [];
  const sleeps: number[] = [];
  const catalog = createMusicBrainzCatalog({
    userAgent: 'xd-memories/0.0 (me@example.com)',
    fetch: async (input, init) => {
      calls.push({ url: new URL(String(input)), headers: new Headers(init?.headers) });
      return respond();
    },
    clock: () => new Date(time),
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
    },
  });
  const advance = (ms: number) => {
    time += ms;
  };
  return { catalog, calls, sleeps, advance };
};

const searchWith = async (response: Response, query: CatalogQuery = okComputer) => {
  const { catalog, calls } = setup(() => response);
  const result = await catalog.search(query);
  return { calls, result };
};

describe('the request', () => {
  it('makes exactly one call', async () => {
    const { calls } = await searchWith(json(albumSearch));

    expect(calls).toHaveLength(1);
  });

  it('searches MusicBrainz release groups', async () => {
    const { calls } = await searchWith(json(albumSearch));

    expect(`${calls[0]?.url.origin}${calls[0]?.url.pathname}`).toBe(
      'https://musicbrainz.org/ws/2/release-group',
    );
  });

  it.each`
    param      | value
    ${'query'} | ${'(ok computer) AND primarytype:album'}
    ${'fmt'}   | ${'json'}
    ${'limit'} | ${'20'}
  `('sends $param=$value', async ({ param, value }: { param: string; value: string }) => {
    const { calls } = await searchWith(json(albumSearch));

    expect(calls[0]?.url.searchParams.get(param)).toBe(value);
  });

  it('escapes search syntax in the query, so user text never changes the search', async () => {
    const { calls } = await searchWith(json({ 'release-groups': [] }), {
      mediaType: 'album',
      query: 'AC/DC: live! (1992)',
    });

    expect(calls[0]?.url.searchParams.get('query')).toBe(
      '(AC\\/DC\\: live\\! \\(1992\\)) AND primarytype:album',
    );
  });

  it('identifies itself with a User-Agent, as MusicBrainz requires', async () => {
    const { calls } = await searchWith(json(albumSearch));

    expect(calls[0]?.headers.get('User-Agent')).toBe('xd-memories/0.0 (me@example.com)');
  });

  it.each(['movie', 'series', 'book'] as const)('%s never calls MusicBrainz', async (mediaType) => {
    const { calls } = await searchWith(json(albumSearch), { mediaType, query: 'ok' });

    expect(calls).toHaveLength(0);
  });
});

describe('staying under 1 request per second, with a margin for network jitter (1200 ms)', () => {
  it('the first search does not wait', async () => {
    const { catalog, sleeps } = setup();

    await catalog.search(okComputer);

    expect(sleeps).toEqual([0]);
  });

  it('a search right after another waits the full 1200 ms', async () => {
    const { catalog, sleeps } = setup();

    await catalog.search(okComputer);
    await catalog.search(okComputer);

    expect(sleeps).toEqual([0, 1200]);
  });

  it('waits only for what is left of the interval', async () => {
    const { catalog, sleeps, advance } = setup();

    await catalog.search(okComputer);
    advance(400);
    await catalog.search(okComputer);

    expect(sleeps).toEqual([0, 800]);
  });

  it('searches started together are still spaced an interval apart', async () => {
    const { catalog, sleeps } = setup();

    await Promise.all([catalog.search(okComputer), catalog.search(okComputer)]);

    expect(sleeps).toEqual([0, 1200]);
  });

  it('an unsupported media type does not use up a slot', async () => {
    const { catalog, sleeps } = setup();

    await catalog.search({ mediaType: 'book', query: 'dune' });
    await catalog.search(okComputer);

    expect(sleeps).toEqual([0]);
  });
});

describe('successful responses', () => {
  it('release groups are parsed into albums', async () => {
    const { result } = await searchWith(json(albumSearch));

    expect(unwrap(result)[0]).toMatchObject({ mediaType: 'album', title: 'OK Computer' });
  });
});

describe('failures are typed errors that say what to fix', () => {
  it.each(['movie', 'series', 'book'] as const)('%s is UnsupportedMediaType', async (mediaType) => {
    const { result } = await searchWith(json(albumSearch), { mediaType, query: 'ok' });

    expect(result).toEqual({ ok: false, error: { kind: 'UnsupportedMediaType', mediaType } });
  });

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
    const { catalog } = setup(() => {
      throw new TypeError('fetch failed');
    });

    const result = await catalog.search(okComputer);

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

import { describe, expect, it } from 'vitest';
import { getJson } from '../http';

type Call = { url: URL; headers: Headers };

const ENDPOINT = new URL('https://source.example/search?q=dune');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const getWith = async (response: Response, headers: Record<string, string> = {}) => {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), headers: new Headers(init?.headers) });
    return response;
  };
  const result = await getJson(fetch, ENDPOINT, headers);
  return { calls, result };
};

describe('the request', () => {
  it('calls the given URL once', async () => {
    const { calls } = await getWith(json({}));

    expect(calls.map((call) => call.url.href)).toEqual([ENDPOINT.href]);
  });

  it('sends the given headers', async () => {
    const { calls } = await getWith(json({}), { 'User-Agent': 'xd-memories/0.0' });

    expect(calls[0]?.headers.get('User-Agent')).toBe('xd-memories/0.0');
  });
});

describe('a successful response', () => {
  it('is the JSON body, unparsed', async () => {
    const { result } = await getWith(json({ docs: [1, 2] }));

    expect(result).toEqual({ ok: true, value: { docs: [1, 2] } });
  });

  it('that is not JSON is InvalidResponse', async () => {
    const { result } = await getWith(new Response('<html>oops</html>', { status: 200 }));

    expect(result).toEqual({
      ok: false,
      error: { kind: 'InvalidResponse', detail: expect.any(String) },
    });
  });
});

describe('failures are typed errors that say what to fix', () => {
  it.each([401, 403])('%i is Unauthorized: check the credentials', async (status) => {
    const { result } = await getWith(json({}, status));

    expect(result).toEqual({ ok: false, error: { kind: 'Unauthorized' } });
  });

  it.each([400, 402, 404, 422, 428, 430, 499])(
    '%i is RequestRejected: our request is wrong',
    async (status) => {
      const { result } = await getWith(json({}, status));

      expect(result).toEqual({ ok: false, error: { kind: 'RequestRejected', status } });
    },
  );

  it.each([500, 502, 503, 599])('%i is SourceUnavailable: the source is down', async (status) => {
    const { result } = await getWith(json({}, status));

    expect(result).toEqual({ ok: false, error: { kind: 'SourceUnavailable' } });
  });

  it('the status decides, even when the error body is not JSON', async () => {
    const { result } = await getWith(new Response('<html>Bad gateway</html>', { status: 503 }));

    expect(result).toEqual({ ok: false, error: { kind: 'SourceUnavailable' } });
  });

  it('a network failure is SourceUnavailable, never a thrown error', async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };

    const result = await getJson(fetch, ENDPOINT, {});

    expect(result).toEqual({ ok: false, error: { kind: 'SourceUnavailable' } });
  });
});

describe('429 RateLimited and its Retry-After header', () => {
  const rateLimited = (headers: Record<string, string>) =>
    new Response('{}', { status: 429, headers });

  it.each`
    header                             | seconds
    ${'10'}                            | ${10}
    ${'0'}                             | ${0}
    ${'soon'}                          | ${null}
    ${'-5'}                            | ${null}
    ${'1.5'}                           | ${null}
    ${'Wed, 21 Oct 2026 07:28:00 GMT'} | ${null}
    ${''}                              | ${null}
  `(
    'Retry-After $header is a wait of $seconds',
    async ({ header, seconds }: { header: string; seconds: number | null }) => {
      const { result } = await getWith(rateLimited({ 'Retry-After': header }));

      expect(result).toEqual({
        ok: false,
        error: { kind: 'RateLimited', retryAfterSeconds: seconds },
      });
    },
  );

  it('no Retry-After header is a wait of unknown length (null)', async () => {
    const { result } = await getWith(rateLimited({}));

    expect(result).toEqual({ ok: false, error: { kind: 'RateLimited', retryAfterSeconds: null } });
  });
});

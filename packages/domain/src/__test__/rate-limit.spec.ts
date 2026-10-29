import { describe, expect, it } from 'vitest';
import { waitBeforeNextRequest } from '../rate-limit';

const now = new Date('2026-10-29T12:00:00.000Z');
const msAgo = (ms: number) => new Date(now.getTime() - ms);

describe('waitBeforeNextRequest (1 request per second by default)', () => {
  it('the first request never waits', () => {
    const wait = waitBeforeNextRequest({ lastRequestAt: null, now });

    expect(wait).toBe(0);
  });

  it.each`
    elapsed | wait
    ${0}    | ${1000}
    ${1}    | ${999}
    ${400}  | ${600}
    ${999}  | ${1}
    ${1000} | ${0}
    ${1001} | ${0}
    ${5000} | ${0}
  `(
    'a request $elapsed ms ago means waiting $wait ms',
    ({ elapsed, wait: expected }: { elapsed: number; wait: number }) => {
      const wait = waitBeforeNextRequest({ lastRequestAt: msAgo(elapsed), now });

      expect(wait).toBe(expected);
    },
  );

  it('takes a different interval when a source asks for one', () => {
    const wait = waitBeforeNextRequest({ lastRequestAt: msAgo(500), now, minIntervalMs: 2000 });

    expect(wait).toBe(1500);
  });

  it('a last request "in the future" (clock moved back) waits one interval, never more', () => {
    const lastRequestAt = new Date(now.getTime() + 60_000);

    const wait = waitBeforeNextRequest({ lastRequestAt, now });

    expect(wait).toBe(1000);
  });
});

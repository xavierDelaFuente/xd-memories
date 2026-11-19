import type { MediaType, Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { continueItems, continueMeta } from '../for-you';

const item = (workId: string, status: Status) => ({ workId, status });

describe('continueItems', () => {
  it('keeps only the works in progress, in the order given', () => {
    const library = [
      item('w1', 'doing'),
      item('w2', 'want'),
      item('w3', 'done'),
      item('w4', 'dropped'),
      item('w5', 'doing'),
    ];

    const items = continueItems(library);

    expect(items.map(({ workId }) => workId)).toEqual(['w1', 'w5']);
  });

  it('is empty when nothing is in progress', () => {
    const items = continueItems([item('w1', 'want'), item('w2', 'done')]);

    expect(items).toEqual([]);
  });
});

describe('continueMeta', () => {
  it.each`
    mediaType   | season  | meta
    ${'book'}   | ${null} | ${'Reading since 5 Nov 2026'}
    ${'movie'}  | ${null} | ${'Watching since 5 Nov 2026'}
    ${'album'}  | ${null} | ${'Listening since 5 Nov 2026'}
    ${'series'} | ${null} | ${'Watching since 5 Nov 2026'}
    ${'series'} | ${2}    | ${'Season 2 · Watching since 5 Nov 2026'}
  `('is "$meta" for a $mediaType, season $season', ({ mediaType, season, meta }) => {
    const label = continueMeta({
      mediaType: mediaType as MediaType,
      season,
      at: new Date(Date.UTC(2026, 10, 5, 23, 30)),
    });

    expect(label).toBe(meta);
  });
});

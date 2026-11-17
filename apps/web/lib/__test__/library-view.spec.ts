import type { MediaType, Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { ADD_STATUSES, historyLabel, STATUS_LABELS, statusLabel } from '../library-view';

// Where works of different media are listed together, "doing" can't name one activity.
describe('STATUS_LABELS', () => {
  it.each`
    status       | label
    ${'want'}    | ${'Want'}
    ${'doing'}   | ${'Active'}
    ${'done'}    | ${'Done'}
    ${'dropped'} | ${'Dropped'}
  `('$status reads "$label"', ({ status, label }: { status: Status; label: string }) => {
    const shown = STATUS_LABELS[status];

    expect(shown).toBe(label);
  });
});

// One work, so one media: "doing" reads as what you do with it.
describe('statusLabel', () => {
  it.each`
    status       | mediaType   | label
    ${'doing'}   | ${'movie'}  | ${'Watching'}
    ${'doing'}   | ${'series'} | ${'Watching'}
    ${'doing'}   | ${'book'}   | ${'Reading'}
    ${'doing'}   | ${'album'}  | ${'Listening'}
    ${'want'}    | ${'book'}   | ${'Want'}
    ${'done'}    | ${'album'}  | ${'Done'}
    ${'dropped'} | ${'movie'}  | ${'Dropped'}
  `(
    '$status on a $mediaType reads "$label"',
    ({ status, mediaType, label }: { status: Status; mediaType: MediaType; label: string }) => {
      const shown = statusLabel(status, mediaType);

      expect(shown).toBe(label);
    },
  );
});

// Nothing starts out given up on: Dropped is set later, from the library.
describe('ADD_STATUSES', () => {
  it('offers want, doing and done', () => {
    const offered = [...ADD_STATUSES];

    expect(offered).toEqual(['want', 'doing', 'done']);
  });
});

describe('historyLabel', () => {
  it.each`
    status     | at                                  | label
    ${'want'}  | ${new Date('2026-11-03T10:00:00Z')} | ${'Want · 3 Nov 2026'}
    ${'doing'} | ${new Date('2026-11-05T09:00:00Z')} | ${'Listening · 5 Nov 2026'}
    ${'done'}  | ${new Date('2026-01-31T23:30:00Z')} | ${'Done · 31 Jan 2026'}
  `('$label', ({ status, at, label }: { status: Status; at: Date; label: string }) => {
    const shown = historyLabel({ status, at }, 'album');

    expect(shown).toBe(label);
  });
});

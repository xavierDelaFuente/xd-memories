import type { MediaType, Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import {
  ADD_STATUSES,
  datesLabel,
  historyLabel,
  STATUS_LABELS,
  statusLabel,
} from '../library-view';

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

// "want 3" is a status given on 3 November 2026.
const historyOf = (entries: readonly string[]) =>
  entries.map((entry) => {
    const [status, day] = entry.split(' ');
    return { status: status as Status, at: new Date(Date.UTC(2026, 10, Number(day), 12)) };
  });

// A work's dates, from its history: when the latest go at it started, and how it ended.
describe('datesLabel', () => {
  it.each`
    history                               | label
    ${['want 3']}                         | ${'Added 3 Nov 2026'}
    ${['want 1', 'doing 3']}              | ${'Started 3 Nov 2026'}
    ${['doing 3', 'done 9']}              | ${'Started 3 Nov 2026 · finished 9 Nov 2026'}
    ${['done 9']}                         | ${'Finished 9 Nov 2026'}
    ${['doing 3', 'dropped 5']}           | ${'Started 3 Nov 2026 · dropped 5 Nov 2026'}
    ${['doing 1', 'done 2', 'doing 5']}   | ${'Started 5 Nov 2026'}
    ${['doing 1', 'done 2', 'want 5']}    | ${'Started 1 Nov 2026 · finished 2 Nov 2026'}
    ${['doing 1', 'dropped 2', 'done 5']} | ${'Started 1 Nov 2026 · finished 5 Nov 2026'}
  `('$history reads "$label"', ({ history, label }: { history: string[]; label: string }) => {
    const shown = datesLabel(historyOf(history));

    expect(shown).toBe(label);
  });

  it('is empty with no history', () => {
    const shown = datesLabel([]);

    expect(shown).toBe('');
  });
});

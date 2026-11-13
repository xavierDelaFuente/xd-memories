import type { MediaType, Rating, Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { historyLabel, libraryLabel, STATUS_LABELS, statusLabel } from '../library-view';

// Where works of different media are listed together, "doing" can't name one activity.
describe('STATUS_LABELS', () => {
  it.each`
    status     | label
    ${'want'}  | ${'Want'}
    ${'doing'} | ${'In progress'}
    ${'done'}  | ${'Done'}
  `('$status reads "$label"', ({ status, label }: { status: Status; label: string }) => {
    const shown = STATUS_LABELS[status];

    expect(shown).toBe(label);
  });
});

// One work, so one media: "doing" reads as what you do with it.
describe('statusLabel', () => {
  it.each`
    status     | mediaType   | label
    ${'doing'} | ${'movie'}  | ${'Watching'}
    ${'doing'} | ${'series'} | ${'Watching'}
    ${'doing'} | ${'book'}   | ${'Reading'}
    ${'doing'} | ${'album'}  | ${'Listening'}
    ${'want'}  | ${'book'}   | ${'Want'}
    ${'done'}  | ${'album'}  | ${'Done'}
  `(
    '$status on a $mediaType reads "$label"',
    ({ status, mediaType, label }: { status: Status; mediaType: MediaType; label: string }) => {
      const shown = statusLabel(status, mediaType);

      expect(shown).toBe(label);
    },
  );
});

describe('libraryLabel', () => {
  const dune = {
    title: 'Dune',
    creators: ['Frank Herbert'],
    year: 1965,
    mediaType: 'book' as const,
    season: null,
  };

  it('reads like the search result, followed by the status for its media', () => {
    const label = libraryLabel({ ...dune, status: 'doing', rating: null });

    expect(label).toBe('Dune (1965) — Frank Herbert · Reading');
  });

  it('a series shows the season reached after its status, before any rating', () => {
    const severance = {
      title: 'Severance',
      creators: [],
      year: 2022,
      mediaType: 'series' as const,
    };

    const label = libraryLabel({ ...severance, status: 'doing', season: 2, rating: 90 as Rating });

    expect(label).toBe('Severance (2022) · Watching · Season 2 · 90/100');
  });

  it.each`
    rating  | shown
    ${87.5} | ${'88/100'}
    ${87.4} | ${'87/100'}
    ${0}    | ${'0/100'}
  `(
    'ends with a rating of $rating, shown rounded as $shown',
    ({ rating, shown }: { rating: number; shown: string }) => {
      const label = libraryLabel({ ...dune, status: 'done', rating: rating as Rating });

      expect(label).toBe(`Dune (1965) — Frank Herbert · Done · ${shown}`);
    },
  );
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

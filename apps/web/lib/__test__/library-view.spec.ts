import type { Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { historyLabel, libraryLabel, STATUS_LABELS } from '../library-view';

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

describe('libraryLabel', () => {
  it('reads like the search result, followed by the status', () => {
    const label = libraryLabel({
      title: 'Dune',
      creators: ['Frank Herbert'],
      year: 1965,
      status: 'doing',
    });

    expect(label).toBe('Dune (1965) — Frank Herbert · In progress');
  });
});

describe('historyLabel', () => {
  it.each`
    status    | at                                  | label
    ${'want'} | ${new Date('2026-11-03T10:00:00Z')} | ${'Want · 3 Nov 2026'}
    ${'done'} | ${new Date('2026-01-31T23:30:00Z')} | ${'Done · 31 Jan 2026'}
  `('$label', ({ status, at, label }: { status: Status; at: Date; label: string }) => {
    const shown = historyLabel({ status, at });

    expect(shown).toBe(label);
  });
});

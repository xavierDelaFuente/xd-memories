import type { Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { libraryLabel, STATUS_LABELS } from '../library-view';

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

import { describe, expect, it } from 'vitest';
import {
  addOrdering,
  createSeries,
  type Ordering,
  orderingNamed,
  progress,
  type Series,
} from '../ordering';
import { unwrap } from './helpers';

const publication = { name: 'publication', workIds: ['w1', 'w2', 'w3'] };
const chronological = { name: 'chronological', workIds: ['w2', 'w1', 'w3'] };

const seriesWith = (...orderings: Ordering[]): Series =>
  orderings.reduce((series, ordering) => unwrap(addOrdering(series, ordering)), createSeries('s1'));

describe('progress', () => {
  it('with nothing done, position is 0 and next is the first work', () => {
    const result = progress(publication, []);

    expect(result).toEqual({ position: 0, next: { position: 1, workId: 'w1' } });
  });

  it('position is the highest done position, even with gaps; next is the work after it', () => {
    const result = progress(publication, ['w1', 'w2']);

    expect(result).toEqual({ position: 2, next: { position: 3, workId: 'w3' } });
  });

  it('when the last work is done, the reader is caught up: next is null', () => {
    const result = progress(publication, ['w1', 'w3']);

    expect(result).toEqual({ position: 3, next: null });
  });

  it('an empty ordering has nothing next', () => {
    const result = progress({ name: 'publication', workIds: [] }, []);

    expect(result).toEqual({ position: 0, next: null });
  });

  it('does not depend on the order the works were done in', () => {
    const forwards = progress(publication, ['w1', 'w2']);

    const backwards = progress(publication, ['w2', 'w1']);

    expect(backwards).toEqual(forwards);
  });

  it('ignores done works that are not part of the ordering', () => {
    const result = progress(publication, ['w1', 'other-saga']);

    expect(result).toEqual({ position: 1, next: { position: 2, workId: 'w2' } });
  });

  it.each`
    ordering         | position
    ${publication}   | ${2}
    ${chronological} | ${1}
  `(
    'the same reading history is position $position in the $ordering.name ordering',
    ({ ordering, position }: { ordering: Ordering; position: number }) => {
      const result = progress(ordering, ['w2']);

      expect(result.position).toBe(position);
    },
  );
});

describe('series orderings', () => {
  it.each`
    name               | ordering
    ${'publication'}   | ${publication}
    ${'chronological'} | ${chronological}
  `(
    'a series with several orderings finds the $name one',
    ({ name, ordering }: { name: string; ordering: Ordering }) => {
      const series = seriesWith(publication, chronological);

      const found = orderingNamed(series, name);

      expect(found).toEqual(ordering);
    },
  );

  it('a new series has no orderings', () => {
    const found = orderingNamed(createSeries('s1'), 'publication');

    expect(found).toBeUndefined();
  });

  it('an unknown ordering name returns undefined', () => {
    const found = orderingNamed(seriesWith(publication), 'recommended');

    expect(found).toBeUndefined();
  });

  it('adding an ordering never mutates the original series', () => {
    const series = createSeries('s1');

    addOrdering(series, publication);

    expect(series.orderings).toHaveLength(0);
  });

  it('rejects an ordering whose name already exists, as a typed error', () => {
    const series = seriesWith(publication);

    const result = addOrdering(series, { name: 'publication', workIds: ['w3', 'w2', 'w1'] });

    expect(result).toEqual({
      ok: false,
      error: { kind: 'DuplicateOrdering', name: 'publication' },
    });
  });

  it('a rejected duplicate leaves the existing ordering in place', () => {
    const series = seriesWith(publication);
    addOrdering(series, { name: 'publication', workIds: ['w3', 'w2', 'w1'] });

    const found = orderingNamed(series, 'publication');

    expect(found).toEqual(publication);
  });
});

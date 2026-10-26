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
    expect(progress(publication, [])).toEqual({
      position: 0,
      next: { position: 1, workId: 'w1' },
    });
  });

  it('position is the highest done position, even with gaps; next is the work after it', () => {
    expect(progress(publication, ['w1', 'w2'])).toEqual({
      position: 2,
      next: { position: 3, workId: 'w3' },
    });
  });

  it('when the last work is done, the reader is caught up: next is null', () => {
    expect(progress(publication, ['w1', 'w3'])).toEqual({ position: 3, next: null });
  });

  it('an empty ordering has nothing next', () => {
    expect(progress({ name: 'publication', workIds: [] }, [])).toEqual({ position: 0, next: null });
  });

  it('does not depend on the order the works were done in', () => {
    expect(progress(publication, ['w2', 'w1'])).toEqual(progress(publication, ['w1', 'w2']));
  });

  it('ignores done works that are not part of the ordering', () => {
    expect(progress(publication, ['w1', 'other-saga'])).toEqual({
      position: 1,
      next: { position: 2, workId: 'w2' },
    });
  });

  it('the same reading history gives a different position in each ordering', () => {
    const done = ['w2'];

    expect(progress(publication, done).position).toBe(2);
    expect(progress(chronological, done).position).toBe(1);
  });
});

describe('series orderings', () => {
  it('a series holds several named orderings without conflict', () => {
    const series = seriesWith(publication, chronological);

    expect(orderingNamed(series, 'publication')).toEqual(publication);
    expect(orderingNamed(series, 'chronological')).toEqual(chronological);
  });

  it('a new series has no orderings', () => {
    expect(orderingNamed(createSeries('s1'), 'publication')).toBeUndefined();
  });

  it('an unknown ordering name returns undefined', () => {
    expect(orderingNamed(seriesWith(publication), 'recommended')).toBeUndefined();
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
    expect(orderingNamed(series, 'publication')).toEqual(publication);
  });
});

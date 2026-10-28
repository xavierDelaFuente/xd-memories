import { describe, expect, it } from 'vitest';
import { createWork } from '../work';
import { unwrap } from './helpers';

describe('createWork', () => {
  it('creates a work with its id, media type and title', () => {
    const result = createWork({ id: 'w1', mediaType: 'movie', title: 'The Matrix' });

    expect(result).toEqual({
      ok: true,
      value: { id: 'w1', mediaType: 'movie', title: 'The Matrix' },
    });
  });

  it('trims surrounding whitespace from the title', () => {
    const result = createWork({ id: 'w1', mediaType: 'book', title: '  Dune \n' });

    expect(result).toEqual({ ok: true, value: { id: 'w1', mediaType: 'book', title: 'Dune' } });
  });

  it('keeps whitespace inside the title', () => {
    const work = unwrap(createWork({ id: 'w1', mediaType: 'book', title: ' The  Lord ' }));

    expect(work.title).toBe('The  Lord');
  });

  it.each(['', '   ', '\n\t', ' '])('rejects the blank title %j as a typed error', (title) => {
    const result = createWork({ id: 'w1', mediaType: 'movie', title });

    expect(result).toEqual({ ok: false, error: { kind: 'BlankTitle' } });
  });

  it.each(['movie', 'series', 'book', 'album'])('accepts the media type %s', (mediaType) => {
    const result = createWork({ id: 'w1', mediaType, title: 'Anything' });

    expect(result).toMatchObject({ ok: true, value: { mediaType } });
  });

  it.each(['podcast', 'Movie', ''])(
    'rejects the unknown media type %j as a typed error',
    (mediaType) => {
      const result = createWork({ id: 'w1', mediaType, title: 'Anything' });

      expect(result).toEqual({ ok: false, error: { kind: 'UnknownMediaType', mediaType } });
    },
  );

  it('when both title and media type are invalid, reports the title first', () => {
    const result = createWork({ id: 'w1', mediaType: 'podcast', title: '' });

    expect(result).toEqual({ ok: false, error: { kind: 'BlankTitle' } });
  });
});

import { describe, expect, it } from 'vitest';
import { createWork } from '../work';

describe('createWork', () => {
  it('creates a work with its id, media type and title', () => {
    expect(createWork({ id: 'w1', mediaType: 'movie', title: 'The Matrix' })).toEqual({
      ok: true,
      value: { id: 'w1', mediaType: 'movie', title: 'The Matrix' },
    });
  });

  it('trims surrounding whitespace from the title', () => {
    const result = createWork({ id: 'w1', mediaType: 'book', title: '  Dune \n' });

    expect(result).toEqual({ ok: true, value: { id: 'w1', mediaType: 'book', title: 'Dune' } });
  });

  it.each(['', '   ', '\n\t'])('rejects the blank title %j as a typed error', (title) => {
    expect(createWork({ id: 'w1', mediaType: 'movie', title })).toEqual({
      ok: false,
      error: { kind: 'BlankTitle' },
    });
  });

  it.each(['movie', 'series', 'book', 'album'])('accepts the media type %s', (mediaType) => {
    expect(createWork({ id: 'w1', mediaType, title: 'Anything' }).ok).toBe(true);
  });

  it.each(['podcast', 'Movie', ''])(
    'rejects the unknown media type %j as a typed error',
    (mediaType) => {
      expect(createWork({ id: 'w1', mediaType, title: 'Anything' })).toEqual({
        ok: false,
        error: { kind: 'UnknownMediaType', mediaType },
      });
    },
  );

  it('keeps whitespace inside the title', () => {
    const result = createWork({ id: 'w1', mediaType: 'book', title: ' The  Lord of the Rings ' });

    expect(result.ok && result.value.title).toBe('The  Lord of the Rings');
  });

  it('treats a non-breaking space as blank', () => {
    expect(createWork({ id: 'w1', mediaType: 'movie', title: '\u00a0' }).ok).toBe(false);
  });

  it('when both title and media type are invalid, reports the title first', () => {
    expect(createWork({ id: 'w1', mediaType: 'podcast', title: '' })).toEqual({
      ok: false,
      error: { kind: 'BlankTitle' },
    });
  });
});

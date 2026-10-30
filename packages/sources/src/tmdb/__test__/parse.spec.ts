import { describe, expect, it } from 'vitest';
import { unwrap } from '../../__test__/helpers';
import movieSearch from '../fixtures/search-movie-matrix.json' with { type: 'json' };
import tvSearch from '../fixtures/search-tv-matrix.json' with { type: 'json' };
import { parseMovieSearch, parseTvSearch } from '../parse';

describe('parseMovieSearch (recorded TMDB response)', () => {
  it('parses a result into a catalog item with a TMDB ref', () => {
    const items = unwrap(parseMovieSearch(movieSearch));

    expect(items[0]).toEqual({
      ref: { source: 'tmdb', externalId: 'movie/603' },
      mediaType: 'movie',
      title: 'The Matrix',
      creators: [],
      year: 1999,
    });
  });

  it('keeps TMDB order', () => {
    const items = unwrap(parseMovieSearch(movieSearch));

    expect(items.slice(0, 3).map((item) => item.title)).toEqual([
      'The Matrix',
      'The Matrix Reloaded',
      'The Matrix Resurrections',
    ]);
  });

  it('parses every result on the page', () => {
    const items = unwrap(parseMovieSearch(movieSearch));

    expect(items).toHaveLength(movieSearch.results.length);
  });
});

describe('parseTvSearch (recorded TMDB response)', () => {
  it('parses a TV result into a series, using its name as the title', () => {
    const items = unwrap(parseTvSearch(tvSearch));

    expect(items[0]).toEqual({
      ref: { source: 'tmdb', externalId: 'tv/711' },
      mediaType: 'series',
      title: 'Threat Matrix',
      creators: [],
      year: 2003,
    });
  });

  it('parses every result, including shows with no first air date', () => {
    const items = unwrap(parseTvSearch(tvSearch));

    expect(items).toHaveLength(tvSearch.results.length);
  });
});

describe('the year comes from the release date', () => {
  it.each`
    case               | result
    ${'an empty date'} | ${{ id: 1, title: 'Unreleased', release_date: '' }}
    ${'no date field'} | ${{ id: 1, title: 'Unreleased' }}
  `('a movie with $case has no year', ({ result }: { result: unknown }) => {
    const [movie] = unwrap(parseMovieSearch({ results: [result] }));

    expect(movie?.year).toBeNull();
  });

  it('a show takes its year from the first air date', () => {
    const [show] = unwrap(
      parseTvSearch({ results: [{ id: 1, name: 'Matrix', first_air_date: '1993-03-01' }] }),
    );

    expect(show?.year).toBe(1993);
  });

  it('a show with an empty first air date has no year', () => {
    const [show] = unwrap(
      parseTvSearch({ results: [{ id: 1, name: 'Soon', first_air_date: '' }] }),
    );

    expect(show?.year).toBeNull();
  });
});

describe('TMDB identity', () => {
  it('a movie and a TV show with the same TMDB number are different refs', () => {
    const [movie] = unwrap(parseMovieSearch({ results: [{ id: 1399, title: 'A movie' }] }));

    const [show] = unwrap(parseTvSearch({ results: [{ id: 1399, name: 'A show' }] }));

    expect(movie?.ref).not.toEqual(show?.ref);
  });
});

describe('malformed responses are typed errors, never casts or crashes', () => {
  const invalid = { ok: false, error: { kind: 'InvalidResponse', detail: expect.any(String) } };

  it.each`
    case                            | payload
    ${'null'}                       | ${null}
    ${'a string'}                   | ${'not json'}
    ${'no results field'}           | ${{ page: 1 }}
    ${'results that is not a list'} | ${{ results: 'nope' }}
    ${'an id that is not a number'} | ${{ results: [{ id: '603', title: 'The Matrix' }] }}
    ${'a movie without a title'}    | ${{ results: [{ id: 603 }] }}
  `('movie search: $case', ({ payload }: { payload: unknown }) => {
    const result = parseMovieSearch(payload);

    expect(result).toEqual(invalid);
  });

  it('tv search: a show without a name', () => {
    const result = parseTvSearch({ results: [{ id: 711, title: 'Threat Matrix' }] });

    expect(result).toEqual(invalid);
  });
});

import { describe, expect, it } from 'vitest';
import movieSearch from '../fixtures/search-movie-matrix.json' with { type: 'json' };
import tvSearch from '../fixtures/search-tv-matrix.json' with { type: 'json' };
import { parseMovieSearch, parseTvSearch } from '../parse';

describe('parseMovieSearch (recorded TMDB response)', () => {
  it('parses a result into a catalog item with a TMDB ref', () => {
    const result = parseMovieSearch(movieSearch);

    expect(result.ok && result.value[0]).toEqual({
      ref: { source: 'tmdb', externalId: 'movie/603' },
      mediaType: 'movie',
      title: 'The Matrix',
    });
  });

  it('parses every result on the page, in TMDB order', () => {
    const result = parseMovieSearch(movieSearch);

    expect(result.ok && result.value.map((item) => item.title).slice(0, 3)).toEqual([
      'The Matrix',
      'The Matrix Reloaded',
      'The Matrix Resurrections',
    ]);
    expect(result.ok && result.value).toHaveLength(movieSearch.results.length);
  });
});

describe('parseTvSearch (recorded TMDB response)', () => {
  it('parses a TV result into a series, using its name as the title', () => {
    const result = parseTvSearch(tvSearch);

    expect(result.ok && result.value[0]).toEqual({
      ref: { source: 'tmdb', externalId: 'tv/711' },
      mediaType: 'series',
      title: 'Threat Matrix',
    });
  });

  it('parses every result, including shows with no first air date', () => {
    const result = parseTvSearch(tvSearch);

    expect(result.ok && result.value).toHaveLength(tvSearch.results.length);
  });
});

describe('TMDB identity', () => {
  it('a movie and a TV show with the same TMDB number are different refs', () => {
    const movie = parseMovieSearch({ results: [{ id: 1399, title: 'A movie' }] });
    const show = parseTvSearch({ results: [{ id: 1399, name: 'A show' }] });

    expect(movie.ok && movie.value[0]?.ref).not.toEqual(show.ok && show.value[0]?.ref);
  });
});

describe('malformed responses are typed errors, never casts or crashes', () => {
  it.each([
    ['null', null],
    ['a string', 'not json'],
    ['no results field', { page: 1 }],
    ['results that is not a list', { results: 'nope' }],
    ['an id that is not a number', { results: [{ id: '603', title: 'The Matrix' }] }],
    ['a movie without a title', { results: [{ id: 603 }] }],
  ])('movie search: %s', (_case, payload) => {
    expect(parseMovieSearch(payload)).toEqual({
      ok: false,
      error: { kind: 'InvalidResponse', detail: expect.any(String) },
    });
  });

  it('tv search: a show without a name', () => {
    expect(parseTvSearch({ results: [{ id: 711, title: 'Threat Matrix' }] })).toEqual({
      ok: false,
      error: { kind: 'InvalidResponse', detail: expect.any(String) },
    });
  });
});

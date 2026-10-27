import { describe, expect, it } from 'vitest';
import movieSearch from '../fixtures/search-movie-matrix.json' with { type: 'json' };
import { parseMovieSearch } from '../parse';

describe('parseMovieSearch (recorded TMDB response)', () => {
  it('parses a result into a catalog item with a TMDB ref', () => {
    const result = parseMovieSearch(movieSearch);

    expect(result.ok && result.value[0]).toEqual({
      ref: { source: 'tmdb', externalId: '603' },
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

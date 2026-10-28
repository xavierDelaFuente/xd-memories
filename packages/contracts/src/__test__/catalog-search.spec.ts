import type { CatalogQuery } from '@xd-memories/domain';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { CatalogSearchQuery } from '../catalog-search';

describe('CatalogSearchQuery', () => {
  it('accepts a known media type and a query', () => {
    expect(CatalogSearchQuery.safeParse({ mediaType: 'movie', query: 'matrix' })).toEqual({
      success: true,
      data: { mediaType: 'movie', query: 'matrix' },
    });
  });

  it.each(['movie', 'series', 'book', 'album'])('accepts the media type %s', (mediaType) => {
    expect(CatalogSearchQuery.safeParse({ mediaType, query: 'x' }).success).toBe(true);
  });

  it('trims surrounding whitespace from the query', () => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType: 'book', query: '  dune \n' });

    expect(parsed.success && parsed.data.query).toBe('dune');
  });

  it('keeps whitespace inside the query', () => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType: 'movie', query: ' star  wars ' });

    expect(parsed.success && parsed.data.query).toBe('star  wars');
  });

  it.each(['', '   ', '\n\t', ' '])('rejects the blank query %j', (query) => {
    expect(CatalogSearchQuery.safeParse({ mediaType: 'movie', query }).success).toBe(false);
  });

  it.each(['podcast', 'Movie', 'movies', ''])('rejects the unknown media type %j', (mediaType) => {
    expect(CatalogSearchQuery.safeParse({ mediaType, query: 'matrix' }).success).toBe(false);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['no query', { mediaType: 'movie' }],
    ['no media type', { query: 'matrix' }],
    ['a query that is not text', { mediaType: 'movie', query: 42 }],
  ])('rejects %s', (_case, input) => {
    expect(CatalogSearchQuery.safeParse(input).success).toBe(false);
  });

  it('drops fields it does not know', () => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType: 'movie', query: 'x', page: 9 });

    expect(parsed.success && parsed.data).toEqual({ mediaType: 'movie', query: 'x' });
  });

  it('produces exactly the query the domain catalog port takes', () => {
    expectTypeOf<ReturnType<typeof CatalogSearchQuery.parse>>().toEqualTypeOf<CatalogQuery>();
  });
});

import type { CatalogQuery } from '@xd-memories/domain';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { CatalogSearchQuery } from '../catalog-search';

describe('CatalogSearchQuery', () => {
  it('accepts a known media type and a query', () => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType: 'movie', query: 'matrix' });

    expect(parsed).toEqual({ success: true, data: { mediaType: 'movie', query: 'matrix' } });
  });

  it.each(['movie', 'series', 'book', 'album'])('accepts the media type %s', (mediaType) => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType, query: 'x' });

    expect(parsed).toEqual({ success: true, data: { mediaType, query: 'x' } });
  });

  it.each`
    case                                   | query             | expected
    ${'trims surrounding whitespace'}      | ${'  dune \n'}    | ${'dune'}
    ${'keeps whitespace inside the query'} | ${' star  wars '} | ${'star  wars'}
  `('$case', ({ query, expected }: { query: string; expected: string }) => {
    const parsed = CatalogSearchQuery.parse({ mediaType: 'movie', query });

    expect(parsed.query).toBe(expected);
  });

  it.each(['', '   ', '\n\t', ' '])('rejects the blank query %j', (query) => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType: 'movie', query });

    expect(parsed.success).toBe(false);
  });

  it.each(['podcast', 'Movie', 'movies', ''])('rejects the unknown media type %j', (mediaType) => {
    const parsed = CatalogSearchQuery.safeParse({ mediaType, query: 'matrix' });

    expect(parsed.success).toBe(false);
  });

  it.each`
    case                          | input
    ${'nothing'}                  | ${undefined}
    ${'null'}                     | ${null}
    ${'no query'}                 | ${{ mediaType: 'movie' }}
    ${'no media type'}            | ${{ query: 'matrix' }}
    ${'a query that is not text'} | ${{ mediaType: 'movie', query: 42 }}
  `('rejects $case', ({ input }: { input: unknown }) => {
    const parsed = CatalogSearchQuery.safeParse(input);

    expect(parsed.success).toBe(false);
  });

  it('drops fields it does not know', () => {
    const parsed = CatalogSearchQuery.parse({ mediaType: 'movie', query: 'x', page: 9 });

    expect(parsed).toEqual({ mediaType: 'movie', query: 'x' });
  });

  it('produces exactly the query the domain catalog port takes', () => {
    expectTypeOf<ReturnType<typeof CatalogSearchQuery.parse>>().toEqualTypeOf<CatalogQuery>();
  });
});

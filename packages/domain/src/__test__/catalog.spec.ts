import { describe, expect, it } from 'vitest';
import {
  type CatalogItem,
  type CatalogSource,
  catalogByMediaType,
  inMemoryCatalog,
} from '../catalog';
import type { MediaType } from '../work';

const item = (externalId: string, mediaType: CatalogItem['mediaType'], title: string) => ({
  ref: { source: 'fixture', externalId },
  mediaType,
  title,
  creators: [],
  year: null,
});

const matrix = item('m1', 'movie', 'The Matrix');
const matrixReloaded = item('m2', 'movie', 'The Matrix Reloaded');
const animatrix = item('s1', 'series', 'The Animatrix');
const dune = item('b1', 'book', 'Dune');

const catalog = inMemoryCatalog([matrix, matrixReloaded, animatrix, dune]);

describe('inMemoryCatalog', () => {
  it('returns items of the requested media type whose title matches the query', async () => {
    const result = await catalog.search({ mediaType: 'movie', query: 'matrix' });

    expect(result).toEqual({ ok: true, value: [matrix, matrixReloaded] });
  });

  it('never returns items of another media type, even when the title matches', async () => {
    const result = await catalog.search({ mediaType: 'series', query: 'matrix' });

    expect(result).toEqual({ ok: true, value: [animatrix] });
  });

  it('matches regardless of letter case', async () => {
    const result = await catalog.search({ mediaType: 'book', query: 'DUNE' });

    expect(result).toEqual({ ok: true, value: [dune] });
  });

  it('a blank query matches every item of the media type; contracts reject blank queries first (2.5)', async () => {
    const result = await catalog.search({ mediaType: 'movie', query: '' });

    expect(result).toEqual({ ok: true, value: [matrix, matrixReloaded] });
  });

  it('no match is an empty list, not an error', async () => {
    const result = await catalog.search({ mediaType: 'album', query: 'matrix' });

    expect(result).toEqual({ ok: true, value: [] });
  });
});

describe('catalogByMediaType', () => {
  const movies = inMemoryCatalog([matrix, matrixReloaded]);
  const books = inMemoryCatalog([dune]);
  const routed = catalogByMediaType({ movie: movies, book: books });

  it.each`
    mediaType  | query       | expected
    ${'movie'} | ${'matrix'} | ${[matrix, matrixReloaded]}
    ${'book'}  | ${'dune'}   | ${[dune]}
  `(
    'sends a $mediaType search to the $mediaType source',
    async ({
      mediaType,
      query,
      expected,
    }: {
      mediaType: MediaType;
      query: string;
      expected: CatalogItem[];
    }) => {
      const result = await routed.search({ mediaType, query });

      expect(result).toEqual({ ok: true, value: expected });
    },
  );

  it('a media type with no source is UnsupportedMediaType', async () => {
    const result = await routed.search({ mediaType: 'album', query: 'dune' });

    expect(result).toEqual({
      ok: false,
      error: { kind: 'UnsupportedMediaType', mediaType: 'album' },
    });
  });

  it('passes a source error through unchanged', async () => {
    const failing: CatalogSource = {
      search: async () => ({ ok: false, error: { kind: 'SourceUnavailable' } }),
    };

    const result = await catalogByMediaType({ movie: failing }).search({
      mediaType: 'movie',
      query: 'm',
    });

    expect(result).toEqual({ ok: false, error: { kind: 'SourceUnavailable' } });
  });
});

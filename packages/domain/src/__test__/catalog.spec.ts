import { describe, expect, it } from 'vitest';
import { type CatalogItem, inMemoryCatalog } from '../catalog';

const item = (externalId: string, mediaType: CatalogItem['mediaType'], title: string) => ({
  ref: { source: 'fixture', externalId },
  mediaType,
  title,
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

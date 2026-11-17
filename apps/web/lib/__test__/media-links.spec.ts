import type { MediaType } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { mediaLinks, mediaOfPath } from '../media-links';

describe('mediaLinks', () => {
  // The section is Music; the work stays an album (PROJECT Open Question 13).
  it('offers every media, in a fixed order', () => {
    const links = mediaLinks('book', null);

    expect(links.map(({ label }) => label)).toEqual(['Movies', 'Series', 'Books', 'Music']);
  });

  it.each`
    mediaType   | current
    ${'movie'}  | ${'Movies'}
    ${'series'} | ${'Series'}
    ${'book'}   | ${'Books'}
    ${'album'}  | ${'Music'}
  `(
    'searching $mediaType, the current link is $current',
    ({ mediaType, current }: { mediaType: MediaType; current: string }) => {
      const links = mediaLinks(mediaType, null);

      expect(links.filter((link) => link.current).map(({ label }) => label)).toEqual([current]);
    },
  );

  // Outside the catalog, as the sidebar is on every page.
  it('without a current media, no link is current', () => {
    const links = mediaLinks(null, null);

    expect(links.filter((link) => link.current)).toEqual([]);
  });

  it('without a query, each link opens its empty search', () => {
    const links = mediaLinks('movie', null);

    expect(links.map(({ href }) => href)).toEqual([
      '/catalog/movies',
      '/catalog/series',
      '/catalog/books',
      '/catalog/albums',
    ]);
  });

  // Searched "dune" in movies, the books link finds the novel.
  it('with a query, each link searches it again, encoded', () => {
    const links = mediaLinks('movie', 'ok computer & co');

    expect(links.map(({ href }) => href)).toEqual([
      '/catalog/movies?q=ok%20computer%20%26%20co',
      '/catalog/series?q=ok%20computer%20%26%20co',
      '/catalog/books?q=ok%20computer%20%26%20co',
      '/catalog/albums?q=ok%20computer%20%26%20co',
    ]);
  });
});

describe('mediaOfPath', () => {
  it.each`
    pathname               | mediaType
    ${'/catalog/movies'}   | ${'movie'}
    ${'/catalog/series'}   | ${'series'}
    ${'/catalog/books'}    | ${'book'}
    ${'/catalog/albums'}   | ${'album'}
    ${'/catalog/podcasts'} | ${null}
    ${'/catalog/books/42'} | ${null}
    ${'/catalog'}          | ${null}
    ${'/library'}          | ${null}
    ${'/'}                 | ${null}
  `(
    '$pathname is $mediaType',
    ({ pathname, mediaType }: { pathname: string; mediaType: MediaType | null }) => {
      const media = mediaOfPath(pathname);

      expect(media).toBe(mediaType);
    },
  );
});

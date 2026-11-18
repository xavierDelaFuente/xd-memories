import type { MediaType, Rating, Status } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import {
  type LibraryFilter,
  libraryFilter,
  libraryMediaLinks,
  mediaShelf,
  ratingLabel,
  rowMeta,
  shownItems,
  statusTabs,
} from '../library-filter';

const item = (mediaType: MediaType, status: Status) => ({ mediaType, status });

const library = [
  item('book', 'done'),
  item('book', 'want'),
  item('movie', 'doing'),
  item('movie', 'done'),
  item('album', 'dropped'),
];

describe('libraryFilter', () => {
  it.each`
    media        | status       | expected
    ${'books'}   | ${'want'}    | ${{ media: 'book', status: 'want' }}
    ${'albums'}  | ${'dropped'} | ${{ media: 'album', status: 'dropped' }}
    ${undefined} | ${'done'}    | ${{ media: null, status: 'done' }}
    ${'comics'}  | ${'done'}    | ${{ media: null, status: 'done' }}
    ${['books']} | ${['want']}  | ${{ media: 'book', status: 'want' }}
  `(
    'media $media and status $status filter to $expected',
    ({
      media,
      status,
      expected,
    }: {
      media: string | string[] | undefined;
      status: string | string[] | undefined;
      expected: LibraryFilter;
    }) => {
      const filter = libraryFilter(library, { media, status });

      expect(filter).toEqual(expected);
    },
  );

  // An empty tab is a dead end: with no status asked for, the first tab with something in it opens.
  it.each`
    media        | status       | opens
    ${undefined} | ${undefined} | ${'doing'}
    ${'books'}   | ${undefined} | ${'want'}
    ${'albums'}  | ${undefined} | ${'dropped'}
    ${'books'}   | ${'reading'} | ${'want'}
    ${'series'}  | ${undefined} | ${'doing'}
  `(
    'media $media with status $status opens $opens',
    ({
      media,
      status,
      opens,
    }: {
      media: string | undefined;
      status: string | undefined;
      opens: Status;
    }) => {
      const filter = libraryFilter(library, { media, status });

      expect(filter.status).toBe(opens);
    },
  );
});

describe('shownItems', () => {
  it.each`
    media      | status     | shown
    ${null}    | ${'done'}  | ${[item('book', 'done'), item('movie', 'done')]}
    ${'book'}  | ${'done'}  | ${[item('book', 'done')]}
    ${'movie'} | ${'doing'} | ${[item('movie', 'doing')]}
    ${'album'} | ${'want'}  | ${[]}
  `(
    'media $media, status $status shows $shown',
    ({
      media,
      status,
      shown,
    }: {
      media: MediaType | null;
      status: Status;
      shown: ReturnType<typeof item>[];
    }) => {
      const items = shownItems(library, { media, status });

      expect(items).toEqual(shown);
    },
  );
});

describe('libraryMediaLinks', () => {
  it('offers all media, then each by its section name', () => {
    const links = libraryMediaLinks({ media: null, status: 'done' });

    expect(links.map(({ label }) => label)).toEqual(['All', 'Movies', 'Series', 'Books', 'Music']);
  });

  // Another media has other works in it, so the tab is left to open on one that has some.
  it('each leads to that media, without the status', () => {
    const links = libraryMediaLinks({ media: null, status: 'done' });

    expect(links.map(({ href }) => href)).toEqual([
      '/library',
      '/library?media=movies',
      '/library?media=series',
      '/library?media=books',
      '/library?media=albums',
    ]);
  });

  it.each`
    media      | current
    ${null}    | ${'All'}
    ${'book'}  | ${'Books'}
    ${'album'} | ${'Music'}
  `(
    'with media $media, $current is current',
    ({ media, current }: { media: MediaType | null; current: string }) => {
      const links = libraryMediaLinks({ media, status: 'want' });

      expect(links.filter((link) => link.current).map(({ label }) => label)).toEqual([current]);
    },
  );
});

describe('statusTabs', () => {
  it('counts each status within all media, "doing" read as Active', () => {
    const tabs = statusTabs(library, { media: null, status: 'done' });

    expect(tabs.map(({ label, count }) => `${label} ${count}`)).toEqual([
      'Active 1',
      'Want 1',
      'Done 2',
      'Dropped 1',
    ]);
  });

  // One media, so "doing" reads as what you do with it.
  it('within one media, counts only that media and names its activity', () => {
    const tabs = statusTabs(library, { media: 'book', status: 'want' });

    expect(tabs.map(({ label, count }) => `${label} ${count}`)).toEqual([
      'Reading 0',
      'Want 1',
      'Done 1',
      'Dropped 0',
    ]);
  });

  it('each leads to its status, keeping the media', () => {
    const tabs = statusTabs(library, { media: 'book', status: 'want' });

    expect(tabs.map(({ href }) => href)).toEqual([
      '/library?media=books&status=doing',
      '/library?media=books&status=want',
      '/library?media=books&status=done',
      '/library?media=books&status=dropped',
    ]);
  });

  it('across all media, leads to the status alone', () => {
    const tabs = statusTabs(library, { media: null, status: 'want' });

    expect(tabs[0]?.href).toBe('/library?status=doing');
  });

  it('marks the current status', () => {
    const tabs = statusTabs(library, { media: null, status: 'done' });

    expect(tabs.filter((tab) => tab.current).map(({ label }) => label)).toEqual(['Done']);
  });
});

// The line under a title: who made it, when, and how far a series has got.
describe('rowMeta', () => {
  it.each`
    creators                            | year    | season  | meta
    ${['Frank Herbert']}                | ${1965} | ${null} | ${'Frank Herbert · 1965'}
    ${['Kim Stanley Robinson', 'Anon']} | ${null} | ${null} | ${'Kim Stanley Robinson, Anon'}
    ${[]}                               | ${2022} | ${2}    | ${'2022 · Season 2'}
    ${[]}                               | ${null} | ${null} | ${''}
  `(
    'creators $creators, year $year, season $season read "$meta"',
    ({
      creators,
      year,
      season,
      meta,
    }: {
      creators: string[];
      year: number | null;
      season: number | null;
      meta: string;
    }) => {
      const shown = rowMeta({ creators, year, season });

      expect(shown).toBe(meta);
    },
  );
});

describe('ratingLabel', () => {
  it.each`
    rating  | label
    ${87.5} | ${'88/100'}
    ${87.4} | ${'87/100'}
    ${0}    | ${'0/100'}
  `('a rating of $rating reads $label', ({ rating, label }: { rating: number; label: string }) => {
    const shown = ratingLabel(rating as Rating);

    expect(shown).toBe(label);
  });
});

// From a work's page, back to the library at its media.
describe('mediaShelf', () => {
  it.each`
    mediaType   | label       | href
    ${'movie'}  | ${'Movies'} | ${'/library?media=movies'}
    ${'series'} | ${'Series'} | ${'/library?media=series'}
    ${'book'}   | ${'Books'}  | ${'/library?media=books'}
    ${'album'}  | ${'Music'}  | ${'/library?media=albums'}
  `(
    'a $mediaType is shelved under $label',
    ({ mediaType, label, href }: { mediaType: MediaType; label: string; href: string }) => {
      const shelf = mediaShelf(mediaType);

      expect(shelf).toEqual({ label, href });
    },
  );
});

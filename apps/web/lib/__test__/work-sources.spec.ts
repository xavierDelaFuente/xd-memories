import { describe, expect, it } from 'vitest';
import { sourceLink } from '../work-sources';

// Where a work came from, named, and linked to its page there.
describe('sourceLink', () => {
  it.each`
    source           | externalId                                              | name              | href
    ${'tmdb'}        | ${'movie/603'}                                          | ${'TMDB'}         | ${'https://www.themoviedb.org/movie/603'}
    ${'tmdb'}        | ${'tv/95396'}                                           | ${'TMDB'}         | ${'https://www.themoviedb.org/tv/95396'}
    ${'openlibrary'} | ${'works/OL893415W'}                                    | ${'Open Library'} | ${'https://openlibrary.org/works/OL893415W'}
    ${'musicbrainz'} | ${'release-group/b1392450-e666-3926-a536-22c65f834433'} | ${'MusicBrainz'}  | ${'https://musicbrainz.org/release-group/b1392450-e666-3926-a536-22c65f834433'}
  `(
    '$source $externalId links to $href',
    ({
      source,
      externalId,
      name,
      href,
    }: {
      source: string;
      externalId: string;
      name: string;
      href: string;
    }) => {
      const link = sourceLink({ source, externalId });

      expect(link).toEqual({ name, href });
    },
  );

  it.each`
    source
    ${'fixture'}
    ${'constructor'}
    ${'__proto__'}
  `('names $source, a source it has no page for, unlinked', ({ source }: { source: string }) => {
    const link = sourceLink({ source, externalId: 'b1' });

    expect(link).toEqual({ name: source, href: null });
  });

  // An id comes from the source's answer: whatever it says, the link stays on the source's site.
  it.each`
    externalId
    ${'.evil.example/movie/1'}
    ${'@evil.example/movie/1'}
    ${':8080/movie/1'}
    ${'//evil.example/movie/1'}
  `('keeps $externalId on the source’s site', ({ externalId }: { externalId: string }) => {
    const link = sourceLink({ source: 'tmdb', externalId });

    expect(new URL(link.href ?? '').origin).toBe('https://www.themoviedb.org');
  });
});

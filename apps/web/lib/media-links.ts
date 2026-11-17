import type { MediaType } from '@xd-memories/domain';
import type { NavLink } from './nav';

// The catalog's URL segment for each media. Kept free of server-only imports: the sidebar, a
// client component, builds its links from it too.
export const SEGMENTS: ReadonlyMap<string, MediaType> = new Map([
  ['movies', 'movie'],
  ['series', 'series'],
  ['books', 'book'],
  ['albums', 'album'],
]);

// The section is Music; the work stays an album (PROJECT Open Question 13).
export const SECTION_LABELS: Record<MediaType, string> = {
  movie: 'Movies',
  series: 'Series',
  book: 'Books',
  album: 'Music',
};

// One link per media; switching keeps the query, so a search can be tried in another media.
export function mediaLinks(current: MediaType | null, query: string | null): NavLink[] {
  const search = query === null ? '' : `?q=${encodeURIComponent(query)}`;
  return [...SEGMENTS].map(([segment, mediaType]) => ({
    href: `/catalog/${segment}${search}`,
    label: SECTION_LABELS[mediaType],
    current: mediaType === current,
  }));
}

// The media a catalog page searches: /catalog/books is books; anywhere else, none.
export function mediaOfPath(pathname: string): MediaType | null {
  const [, section, segment, ...rest] = pathname.split('/');
  if (section !== 'catalog' || segment === undefined || rest.length > 0) return null;
  return SEGMENTS.get(segment) ?? null;
}

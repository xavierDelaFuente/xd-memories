import { CatalogSearchQuery } from '@xd-memories/contracts';
import type { CatalogItem, CatalogSource, MediaType, SourceError } from '@xd-memories/domain';

const SEGMENTS: ReadonlyMap<string, MediaType> = new Map([
  ['movies', 'movie'],
  ['series', 'series'],
  ['books', 'book'],
  ['albums', 'album'],
]);

const PLURAL: Record<MediaType, string> = {
  movie: 'movies',
  series: 'series',
  book: 'books',
  album: 'albums',
};

export type SearchView =
  | { kind: 'not-found' }
  | { kind: 'idle'; mediaType: MediaType }
  | { kind: 'results'; mediaType: MediaType; query: string; items: CatalogItem[] }
  | { kind: 'error'; mediaType: MediaType; query: string; error: SourceError };

export type SearchParams = { media: string; q: string | string[] | undefined };

export async function searchCatalog(
  { media, q }: SearchParams,
  source: CatalogSource,
): Promise<SearchView> {
  const mediaType = SEGMENTS.get(media);
  if (mediaType === undefined) return { kind: 'not-found' };

  const parsed = CatalogSearchQuery.safeParse({ mediaType, query: Array.isArray(q) ? q[0] : q });
  if (!parsed.success) return { kind: 'idle', mediaType };

  const result = await source.search(parsed.data);
  return result.ok
    ? { kind: 'results', ...parsed.data, items: result.value }
    : { kind: 'error', ...parsed.data, error: result.error };
}

export function messageFor(error: SourceError): string {
  switch (error.kind) {
    case 'UnsupportedMediaType':
      return `Searching ${PLURAL[error.mediaType]} is not available yet.`;
    case 'RateLimited':
      return error.retryAfterSeconds === null
        ? 'Too many searches. Try again shortly.'
        : `Too many searches. Try again in ${error.retryAfterSeconds} seconds.`;
    case 'SourceUnavailable':
      return 'The catalog is not responding. Try again in a moment.';
    case 'Unauthorized':
    case 'RequestRejected':
    case 'InvalidResponse':
      return 'Search is not working right now. The problem is on our side.';
  }
}

// "OK Computer (1997) — Radiohead". Year and creators are what tell same-titled works apart.
export function resultLabel({ title, creators, year }: CatalogItem): string {
  const dated = year === null ? title : `${title} (${year})`;
  return creators.length === 0 ? dated : `${dated} — ${creators.join(', ')}`;
}

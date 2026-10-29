import type { ExternalRef } from './external-ref';
import { err, ok, type Result } from './result';
import type { MediaType, Work } from './work';

export type CatalogQuery = { mediaType: MediaType; query: string };

export type CatalogItem = Omit<Work, 'id'> & { ref: ExternalRef };

export type SourceError =
  | { kind: 'UnsupportedMediaType'; mediaType: MediaType }
  | { kind: 'Unauthorized' }
  | { kind: 'RateLimited'; retryAfterSeconds: number | null }
  | { kind: 'RequestRejected'; status: number }
  | { kind: 'SourceUnavailable' }
  | { kind: 'InvalidResponse'; detail: string };

export type CatalogSource = {
  search(query: CatalogQuery): Promise<Result<CatalogItem[], SourceError>>;
};

export function inMemoryCatalog(items: readonly CatalogItem[]): CatalogSource {
  return {
    async search({ mediaType, query }) {
      const needle = query.toLowerCase();
      return ok(
        items.filter(
          (item) => item.mediaType === mediaType && item.title.toLowerCase().includes(needle),
        ),
      );
    },
  };
}

export function catalogByMediaType(
  sources: Partial<Record<MediaType, CatalogSource>>,
): CatalogSource {
  return {
    async search(query) {
      const source = sources[query.mediaType];
      if (!source) return err({ kind: 'UnsupportedMediaType', mediaType: query.mediaType });
      return source.search(query);
    },
  };
}

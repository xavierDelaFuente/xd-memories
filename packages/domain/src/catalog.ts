import type { ExternalRef } from './external-ref';
import { ok, type Result } from './result';
import type { MediaType, Work } from './work';

export type CatalogQuery = { mediaType: MediaType; query: string };

export type CatalogItem = { work: Work; ref: ExternalRef };

export type SourceError =
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
          ({ work }) => work.mediaType === mediaType && work.title.toLowerCase().includes(needle),
        ),
      );
    },
  };
}

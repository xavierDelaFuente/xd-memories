import { type CatalogItem, err, ok, type Result, type SourceError } from '@xd-memories/domain';
import { z } from 'zod';

const SearchResponse = z.object({
  docs: z.array(z.object({ key: z.string().regex(/^\/works\/[^/]+$/), title: z.string() })),
});

export function parseBookSearch(json: unknown): Result<CatalogItem[], SourceError> {
  const parsed = SearchResponse.safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data.docs.map(
      ({ key, title }): CatalogItem => ({
        ref: { source: 'openlibrary', externalId: key.slice(1) },
        mediaType: 'book',
        title,
      }),
    ),
  );
}

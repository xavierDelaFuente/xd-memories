import { type CatalogItem, err, ok, type Result, type SourceError } from '@xd-memories/domain';
import { z } from 'zod';
import { withRaw } from '../raw';

const SearchResponse = z.object({
  docs: z.array(
    withRaw(
      z.object({
        key: z.string().regex(/^\/works\/[^/]+$/),
        title: z.string(),
        author_name: z.array(z.string()).default([]),
        first_publish_year: z.number().int().optional(),
        cover_i: z.number().int().positive().optional(),
      }),
    ),
  ),
});

// By cover id, which Open Library's covers API serves without a rate limit; M is about 180px wide.
const coverOf = (id: number | undefined) =>
  id === undefined ? null : `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

export function parseBookSearch(json: unknown): Result<CatalogItem[], SourceError> {
  const parsed = SearchResponse.safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data.docs.map(
      ({ value: { key, title, author_name, first_publish_year, cover_i }, raw }): CatalogItem => ({
        ref: { source: 'openlibrary', externalId: key.slice(1) },
        mediaType: 'book',
        title,
        creators: author_name,
        year: first_publish_year ?? null,
        cover: coverOf(cover_i),
        sourceVersion: 'search.json',
        raw,
      }),
    ),
  );
}

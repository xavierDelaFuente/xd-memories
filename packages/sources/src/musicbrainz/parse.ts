import { type CatalogItem, err, ok, type Result, type SourceError } from '@xd-memories/domain';
import { z } from 'zod';

const SearchResponse = z.object({
  'release-groups': z.array(z.object({ id: z.guid(), title: z.string() })),
});

export function parseAlbumSearch(json: unknown): Result<CatalogItem[], SourceError> {
  const parsed = SearchResponse.safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data['release-groups'].map(
      ({ id, title }): CatalogItem => ({
        ref: { source: 'musicbrainz', externalId: `release-group/${id}` },
        mediaType: 'album',
        title,
      }),
    ),
  );
}

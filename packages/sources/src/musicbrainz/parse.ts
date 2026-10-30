import { type CatalogItem, err, ok, type Result, type SourceError } from '@xd-memories/domain';
import { z } from 'zod';
import { yearOf } from '../year';

const SearchResponse = z.object({
  'release-groups': z.array(
    z.object({
      id: z.guid(),
      title: z.string(),
      'artist-credit': z.array(z.object({ name: z.string() })).default([]),
      'first-release-date': z.string().optional(),
    }),
  ),
});

export function parseAlbumSearch(json: unknown): Result<CatalogItem[], SourceError> {
  const parsed = SearchResponse.safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data['release-groups'].map(
      (group): CatalogItem => ({
        ref: { source: 'musicbrainz', externalId: `release-group/${group.id}` },
        mediaType: 'album',
        title: group.title,
        creators: group['artist-credit'].map((credit) => credit.name),
        year: yearOf(group['first-release-date']),
      }),
    ),
  );
}

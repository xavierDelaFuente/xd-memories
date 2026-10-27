import {
  type CatalogItem,
  err,
  type MediaType,
  ok,
  type Result,
  type SourceError,
} from '@xd-memories/domain';
import { z } from 'zod';

type SearchKind = {
  path: 'movie' | 'tv';
  mediaType: MediaType;
  result: z.ZodType<{ id: number; title: string }>;
};

const MOVIE: SearchKind = {
  path: 'movie',
  mediaType: 'movie',
  result: z.object({ id: z.number(), title: z.string() }),
};

const TV: SearchKind = {
  path: 'tv',
  mediaType: 'series',
  result: z
    .object({ id: z.number(), name: z.string() })
    .transform(({ id, name }) => ({ id, title: name })),
};

function parseSearch(json: unknown, kind: SearchKind): Result<CatalogItem[], SourceError> {
  const parsed = z.object({ results: z.array(kind.result) }).safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data.results.map(
      ({ id, title }): CatalogItem => ({
        ref: { source: 'tmdb', externalId: `${kind.path}/${id}` },
        mediaType: kind.mediaType,
        title,
      }),
    ),
  );
}

export const parseMovieSearch = (json: unknown) => parseSearch(json, MOVIE);

export const parseTvSearch = (json: unknown) => parseSearch(json, TV);

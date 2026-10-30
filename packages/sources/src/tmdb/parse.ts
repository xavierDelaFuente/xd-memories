import {
  type CatalogItem,
  err,
  type MediaType,
  ok,
  type Result,
  type SourceError,
} from '@xd-memories/domain';
import { z } from 'zod';
import { yearOf } from '../year';

type SearchKind = {
  path: 'movie' | 'tv';
  mediaType: MediaType;
  result: z.ZodType<{ id: number; title: string; date: string | undefined }>;
};

const MOVIE: SearchKind = {
  path: 'movie',
  mediaType: 'movie',
  result: z
    .object({ id: z.number(), title: z.string(), release_date: z.string().optional() })
    .transform(({ id, title, release_date }) => ({ id, title, date: release_date })),
};

const TV: SearchKind = {
  path: 'tv',
  mediaType: 'series',
  result: z
    .object({ id: z.number(), name: z.string(), first_air_date: z.string().optional() })
    .transform(({ id, name, first_air_date }) => ({ id, title: name, date: first_air_date })),
};

function parseSearch(json: unknown, kind: SearchKind): Result<CatalogItem[], SourceError> {
  const parsed = z.object({ results: z.array(kind.result) }).safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data.results.map(
      ({ id, title, date }): CatalogItem => ({
        ref: { source: 'tmdb', externalId: `${kind.path}/${id}` },
        mediaType: kind.mediaType,
        title,
        // TMDB search carries no director or creator; that needs a credits call per result.
        creators: [],
        year: yearOf(date),
      }),
    ),
  );
}

export const parseMovieSearch = (json: unknown) => parseSearch(json, MOVIE);

export const parseTvSearch = (json: unknown) => parseSearch(json, TV);

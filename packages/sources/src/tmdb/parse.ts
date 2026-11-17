import {
  type CatalogItem,
  err,
  type MediaType,
  ok,
  type Result,
  type SourceError,
} from '@xd-memories/domain';
import { z } from 'zod';
import { withRaw } from '../raw';
import { yearOf } from '../year';

type SearchKind = {
  path: 'movie' | 'tv';
  mediaType: MediaType;
  result: z.ZodType<{
    id: number;
    title: string;
    date: string | undefined;
    poster: string | null | undefined;
  }>;
};

// The poster at a width that suits a cover grid, from TMDB's own image host: the prefix fixes the
// host, whatever the path says.
const POSTERS = 'https://image.tmdb.org/t/p/w342';
const posterPath = z.string().nullish();

const MOVIE: SearchKind = {
  path: 'movie',
  mediaType: 'movie',
  result: z
    .object({
      id: z.number(),
      title: z.string(),
      release_date: z.string().optional(),
      poster_path: posterPath,
    })
    .transform(({ id, title, release_date, poster_path }) => ({
      id,
      title,
      date: release_date,
      poster: poster_path,
    })),
};

const TV: SearchKind = {
  path: 'tv',
  mediaType: 'series',
  result: z
    .object({
      id: z.number(),
      name: z.string(),
      first_air_date: z.string().optional(),
      poster_path: posterPath,
    })
    .transform(({ id, name, first_air_date, poster_path }) => ({
      id,
      title: name,
      date: first_air_date,
      poster: poster_path,
    })),
};

function parseSearch(json: unknown, kind: SearchKind): Result<CatalogItem[], SourceError> {
  const parsed = z.object({ results: z.array(withRaw(kind.result)) }).safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data.results.map(
      ({ value: { id, title, date, poster }, raw }): CatalogItem => ({
        ref: { source: 'tmdb', externalId: `${kind.path}/${id}` },
        mediaType: kind.mediaType,
        title,
        // TMDB search carries no director or creator; that needs a credits call per result.
        creators: [],
        year: yearOf(date),
        cover: poster ? `${POSTERS}${poster}` : null,
        sourceVersion: `3/search/${kind.path}`,
        raw,
      }),
    ),
  );
}

export const parseMovieSearch = (json: unknown) => parseSearch(json, MOVIE);

export const parseTvSearch = (json: unknown) => parseSearch(json, TV);

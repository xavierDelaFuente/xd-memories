import { type CatalogItem, err, ok, type Result, type SourceError } from '@xd-memories/domain';
import { z } from 'zod';

const MovieSearchSchema = z.object({
  results: z.array(z.object({ id: z.number(), title: z.string() })),
});

export function parseMovieSearch(json: unknown): Result<CatalogItem[], SourceError> {
  const parsed = MovieSearchSchema.safeParse(json);
  if (!parsed.success) return err({ kind: 'InvalidResponse', detail: parsed.error.message });
  return ok(
    parsed.data.results.map(
      (movie): CatalogItem => ({
        ref: { source: 'tmdb', externalId: String(movie.id) },
        mediaType: 'movie',
        title: movie.title,
      }),
    ),
  );
}

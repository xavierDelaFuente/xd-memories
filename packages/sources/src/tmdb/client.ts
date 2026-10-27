import { type CatalogSource, err, type SourceError } from '@xd-memories/domain';
import { parseMovieSearch, parseTvSearch } from './parse';

const BASE_URL = 'https://api.themoviedb.org/3';

const SEARCHES = {
  movie: { path: 'movie', parse: parseMovieSearch },
  series: { path: 'tv', parse: parseTvSearch },
} as const;

export type TmdbOptions = { token: string; fetch: typeof globalThis.fetch };

const retryAfterSeconds = (header: string | null): number | null =>
  header !== null && /^\d+$/.test(header) ? Number(header) : null;

function errorFor(response: Response): SourceError {
  const { status } = response;
  if (status === 401 || status === 403) return { kind: 'Unauthorized' };
  if (status === 429) {
    return {
      kind: 'RateLimited',
      retryAfterSeconds: retryAfterSeconds(response.headers.get('Retry-After')),
    };
  }
  if (status >= 400 && status <= 499) return { kind: 'RequestRejected', status };
  return { kind: 'SourceUnavailable' };
}

export function createTmdbCatalog({ token, fetch }: TmdbOptions): CatalogSource {
  return {
    async search({ mediaType, query }) {
      if (mediaType !== 'movie' && mediaType !== 'series') {
        return err({ kind: 'UnsupportedMediaType', mediaType });
      }
      const { path, parse } = SEARCHES[mediaType];
      const url = new URL(`${BASE_URL}/search/${path}`);
      url.searchParams.set('query', query);

      let response: Response;
      try {
        response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        return err({ kind: 'SourceUnavailable' });
      }
      if (!response.ok) return err(errorFor(response));

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return err({ kind: 'InvalidResponse', detail: 'body is not JSON' });
      }
      return parse(body);
    },
  };
}

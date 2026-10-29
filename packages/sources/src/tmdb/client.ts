import { type CatalogSource, err } from '@xd-memories/domain';
import { getJson } from '../http';
import { parseMovieSearch, parseTvSearch } from './parse';

const BASE_URL = 'https://api.themoviedb.org/3';

const SEARCHES = {
  movie: { path: 'movie', parse: parseMovieSearch },
  series: { path: 'tv', parse: parseTvSearch },
} as const;

export type TmdbOptions = { token: string; fetch: typeof globalThis.fetch };

export function createTmdbCatalog({ token, fetch }: TmdbOptions): CatalogSource {
  return {
    async search({ mediaType, query }) {
      if (mediaType !== 'movie' && mediaType !== 'series') {
        return err({ kind: 'UnsupportedMediaType', mediaType });
      }
      const { path, parse } = SEARCHES[mediaType];
      const url = new URL(`${BASE_URL}/search/${path}`);
      url.searchParams.set('query', query);

      const body = await getJson(fetch, url, { Authorization: `Bearer ${token}` });
      return body.ok ? parse(body.value) : body;
    },
  };
}

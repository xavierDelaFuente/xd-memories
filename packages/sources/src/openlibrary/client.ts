import { type CatalogSource, err } from '@xd-memories/domain';
import { getJson } from '../http';
import { parseBookSearch } from './parse';

const SEARCH_URL = 'https://openlibrary.org/search.json';

export type OpenLibraryOptions = { userAgent: string; fetch: typeof globalThis.fetch };

export function createOpenLibraryCatalog({ userAgent, fetch }: OpenLibraryOptions): CatalogSource {
  return {
    async search({ mediaType, query }) {
      if (mediaType !== 'book') return err({ kind: 'UnsupportedMediaType', mediaType });
      const url = new URL(SEARCH_URL);
      url.searchParams.set('q', query);
      url.searchParams.set('fields', 'key,title,author_name,first_publish_year');
      url.searchParams.set('limit', '20');

      const body = await getJson(fetch, url, { 'User-Agent': userAgent });
      return body.ok ? parseBookSearch(body.value) : body;
    },
  };
}

import { type CatalogSource, err, waitBeforeNextRequest } from '@xd-memories/domain';
import { getJson } from '../http';
import { parseAlbumSearch } from './parse';

const SEARCH_URL = 'https://musicbrainz.org/ws/2/release-group';

// MusicBrainz allows 1 req/s with no tolerance: requests spaced exactly 1000 ms apart were
// rejected with 503 (network jitter), 1200 ms passed every time.
const MIN_INTERVAL_MS = 1200;

export type MusicBrainzOptions = {
  userAgent: string;
  fetch: typeof globalThis.fetch;
  clock: () => Date;
  sleep: (ms: number) => Promise<void>;
};

// MusicBrainz reads the query as Lucene syntax; escaping keeps user text a plain search.
const escapeLucene = (text: string) => text.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');

export function createMusicBrainzCatalog({
  userAgent,
  fetch,
  clock,
  sleep,
}: MusicBrainzOptions): CatalogSource {
  let lastRequestAt: Date | null = null;

  return {
    async search({ mediaType, query }) {
      if (mediaType !== 'album') return err({ kind: 'UnsupportedMediaType', mediaType });
      const url = new URL(SEARCH_URL);
      url.searchParams.set('query', `(${escapeLucene(query)}) AND primarytype:album`);
      url.searchParams.set('fmt', 'json');
      url.searchParams.set('limit', '20');

      // Reserve the slot before awaiting, so searches started together are still spaced apart.
      const now = clock();
      const wait = waitBeforeNextRequest({
        lastRequestAt,
        now,
        minIntervalMs: MIN_INTERVAL_MS,
      });
      lastRequestAt = new Date(now.getTime() + wait);
      await sleep(wait);

      const body = await getJson(fetch, url, { 'User-Agent': userAgent });
      return body.ok ? parseAlbumSearch(body.value) : body;
    },
  };
}

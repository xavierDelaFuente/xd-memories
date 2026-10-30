// Runs each real adapter against its live API and checks that a well-known title comes back.
// Unit tests prove we parse the recorded fixtures; this proves the fixtures still match reality.
// Runs on a schedule (.github/workflows/source-health.yml), never in CI: it needs secrets and the network.
// Usage: pnpm source-health
import type { CatalogQuery, CatalogSource } from '@xd-memories/domain';
import { createMusicBrainzCatalog, createOpenLibraryCatalog, createTmdbCatalog } from '../src';

const env = (name: string): string => {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is missing (root .env locally, repository secret in Actions)`);
  return value;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const tmdb = createTmdbCatalog({ token: env('TMDB_API_TOKEN'), fetch });
const userAgent = env('MUSICBRAINZ_USER_AGENT');

type Check = { source: CatalogSource; query: CatalogQuery; expect: string };

const checks: Check[] = [
  { source: tmdb, query: { mediaType: 'movie', query: 'matrix' }, expect: 'The Matrix' },
  { source: tmdb, query: { mediaType: 'series', query: 'breaking bad' }, expect: 'Breaking Bad' },
  {
    source: createOpenLibraryCatalog({ userAgent, fetch }),
    query: { mediaType: 'book', query: 'dune' },
    expect: 'Dune',
  },
  {
    source: createMusicBrainzCatalog({ userAgent, fetch, clock: () => new Date(), sleep }),
    query: { mediaType: 'album', query: 'ok computer' },
    expect: 'OK Computer',
  },
];

// A busy source (MusicBrainz 503s under load) gets one more try before we call it broken.
const RETRY_AFTER_MS = 5000;

async function run({ source, query, expect }: Check): Promise<string | null> {
  let result = await source.search(query);
  if (
    !result.ok &&
    (result.error.kind === 'SourceUnavailable' || result.error.kind === 'RateLimited')
  ) {
    await sleep(RETRY_AFTER_MS);
    result = await source.search(query);
  }
  if (!result.ok) return JSON.stringify(result.error);
  if (!result.value.some((item) => item.title === expect)) {
    return `"${expect}" not in ${result.value.length} results`;
  }
  return null;
}

let failed = 0;
for (const check of checks) {
  const problem = await run(check);
  const label = `${check.query.mediaType} "${check.query.query}"`;
  console.log(problem === null ? `ok    ${label}` : `FAIL  ${label}: ${problem}`);
  if (problem !== null) failed++;
}
if (failed > 0) process.exit(1);

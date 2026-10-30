// Records real source responses as committed fixtures. Tests read these files and never touch the
// network. Re-run to refresh; review the diff like code — it is the early warning that upstream changed.
// Usage: pnpm record-fixtures [source…]   (no argument records every source)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from the root .env`);
  return value;
};

type Recording = { file: string; url: string; headers: () => Record<string, string> };

const tmdb = 'https://api.themoviedb.org/3';
const tmdbHeaders = () => ({ Authorization: `Bearer ${env('TMDB_API_TOKEN')}` });

const openLibrary = 'https://openlibrary.org/search.json';
const openLibraryHeaders = () => ({ 'User-Agent': env('MUSICBRAINZ_USER_AGENT') });

const musicBrainz = 'https://musicbrainz.org/ws/2/release-group';
const musicBrainzHeaders = () => ({ 'User-Agent': env('MUSICBRAINZ_USER_AGENT') });

const sources: Record<string, Recording[]> = {
  tmdb: [
    {
      file: 'src/tmdb/fixtures/search-movie-matrix.json',
      url: `${tmdb}/search/movie?query=matrix&include_adult=false&language=en-US&page=1`,
      headers: tmdbHeaders,
    },
    {
      file: 'src/tmdb/fixtures/search-tv-matrix.json',
      url: `${tmdb}/search/tv?query=matrix&include_adult=false&language=en-US&page=1`,
      headers: tmdbHeaders,
    },
  ],
  openlibrary: [
    {
      file: 'src/openlibrary/fixtures/search-dune.json',
      url: `${openLibrary}?q=dune&fields=key,title,author_name,first_publish_year&limit=20`,
      headers: openLibraryHeaders,
    },
  ],
  musicbrainz: [
    {
      file: 'src/musicbrainz/fixtures/search-ok-computer.json',
      url: `${musicBrainz}?query=${encodeURIComponent('(ok computer) AND primarytype:album')}&fmt=json&limit=20`,
      headers: musicBrainzHeaders,
    },
  ],
};

const wanted = process.argv.slice(2);
const unknown = wanted.filter((name) => !(name in sources));
if (unknown.length > 0) throw new Error(`unknown source(s): ${unknown.join(', ')}`);

const names = wanted.length > 0 ? wanted : Object.keys(sources);
for (const { file, url, headers } of names.flatMap((name) => sources[name] ?? [])) {
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(`${url} → ${response.status} ${response.statusText}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(await response.json(), null, 2)}\n`);
  console.log(`recorded ${file}`);
}

// Records real source responses as committed fixtures. Tests read these files and never touch the
// network. Re-run to refresh; review the diff like code — it is the early warning that upstream changed.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const token = process.env.TMDB_API_TOKEN;
if (!token) throw new Error('TMDB_API_TOKEN is missing from the root .env');

const tmdb = 'https://api.themoviedb.org/3';

const recordings = [
  {
    file: 'src/tmdb/fixtures/search-movie-matrix.json',
    url: `${tmdb}/search/movie?query=matrix&include_adult=false&language=en-US&page=1`,
  },
  {
    file: 'src/tmdb/fixtures/search-tv-matrix.json',
    url: `${tmdb}/search/tv?query=matrix&include_adult=false&language=en-US&page=1`,
  },
];

for (const { file, url } of recordings) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`${url} → ${response.status} ${response.statusText}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(await response.json(), null, 2)}\n`);
  console.log(`recorded ${file}`);
}

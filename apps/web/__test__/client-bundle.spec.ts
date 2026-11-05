import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// Server-only values: none may reach a browser. Every variable .env.example lists is in exactly
// one of these two lists, so a new variable must be classified before this test passes.
const SECRETS = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'TMDB_API_TOKEN', 'GROQ_API_KEY'] as const;
const NOT_SECRET = ['BETTER_AUTH_URL', 'OLLAMA_BASE_URL', 'RECOMMENDER', 'MUSICBRAINZ_USER_AGENT'];

const WEB = join(import.meta.dirname, '..');
const NEXT_DIR = join(WEB, '.next');

// A value found nowhere else, so finding it anywhere means it leaked from the environment.
const CANARIES = Object.fromEntries(
  SECRETS.map((name) => [name, `canary-${name.toLowerCase()}-${randomUUID()}`]),
) as Record<(typeof SECRETS)[number], string>;

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

// What a browser can download: the static assets, and the prerendered pages and RSC payloads.
const SERVED_PAGE = new Set(['.html', '.rsc', '.body', '.meta']);
const clientFiles = () => [
  ...filesUnder(join(NEXT_DIR, 'static')),
  ...filesUnder(join(NEXT_DIR, 'server', 'app')).filter((file) => SERVED_PAGE.has(extname(file))),
];

let served: { file: string; text: string }[];

beforeAll(() => {
  const next = createRequire(join(WEB, 'package.json')).resolve('next/dist/bin/next');
  execFileSync(process.execPath, [next, 'build'], {
    cwd: WEB,
    env: { ...process.env, ...CANARIES },
    stdio: 'pipe',
  });
  served = clientFiles().map((file) => ({ file, text: readFileSync(file, 'utf8') }));
}, 300_000);

const servedContaining = (value: string) =>
  served.filter(({ text }) => text.includes(value)).map(({ file }) => file);

describe('the built client bundle', () => {
  it('is what the scan reads: the home page is in it', () => {
    const files = servedContaining('xd-memories');

    expect(files).not.toEqual([]);
  });

  it.each(SECRETS)('contains no %s', (name) => {
    const files = servedContaining(CANARIES[name]);

    expect(files).toEqual([]);
  });
});

it('every variable in .env.example is classified as secret or not', () => {
  const example = readFileSync(join(WEB, '..', '..', '.env.example'), 'utf8');

  const names = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(([, name]) => name);

  expect(names.sort()).toEqual([...SECRETS, ...NOT_SECRET].sort());
});

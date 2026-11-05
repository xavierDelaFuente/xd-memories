import { hkdfSync } from 'node:crypto';
import type { CatalogItem, Status } from '@xd-memories/domain';
import { hashPassword } from 'better-auth/crypto';
import { type Kysely, sql } from 'kysely';
import { saveWork } from './work-cache';

// The account behind "Try the demo": read-only (0009-read-only-users), so every visitor finds
// the same library. .invalid is reserved: no mail can ever reach this address.
export const DEMO = { id: 'demo', email: 'demo@xd-memories.invalid', name: 'Demo' } as const;

// Derived from the app secret, never stored or shown: only the server can sign in as the demo,
// so no visitor can sign in by hand or change its password.
export const demoPassword = (secret: string) =>
  Buffer.from(hkdfSync('sha256', secret, '', 'xd-memories demo password', 32)).toString(
    'base64url',
  );

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

type DemoWork = {
  item: Omit<CatalogItem, 'raw'>;
  history: [Status, Date][];
  rating?: number;
  season?: number;
  highlightedAt?: Date;
};

// Real catalog refs, so a user who later saves one of these works shares the cached row.
const LIBRARY: DemoWork[] = [
  {
    item: {
      ref: { source: 'tmdb', externalId: 'movie/603' },
      mediaType: 'movie',
      title: 'The Matrix',
      creators: [],
      year: 1999,
      sourceVersion: '3/search/movie',
    },
    history: [['want', day(1)]],
  },
  {
    item: {
      ref: {
        source: 'musicbrainz',
        externalId: 'release-group/b1392450-e666-3926-a536-22c65f834433',
      },
      mediaType: 'album',
      title: 'OK Computer',
      creators: ['Radiohead'],
      year: 1997,
      sourceVersion: 'ws/2/release-group',
    },
    history: [['done', day(3)]],
    rating: 95,
    highlightedAt: day(4),
  },
  {
    item: {
      ref: { source: 'openlibrary', externalId: 'works/OL893414W' },
      mediaType: 'book',
      title: 'Dune',
      creators: ['Frank Herbert'],
      year: 1965,
      sourceVersion: 'search.json',
    },
    history: [
      ['want', day(2)],
      ['doing', day(5)],
      ['done', day(12)],
    ],
    rating: 92,
    highlightedAt: day(12),
  },
  {
    item: {
      ref: { source: 'tmdb', externalId: 'tv/95396' },
      mediaType: 'series',
      title: 'Severance',
      creators: [],
      year: 2022,
      sourceVersion: '3/search/tv',
    },
    history: [['doing', day(15)]],
    rating: 90,
    season: 2,
  },
];

const LIBRARY_TABLES = ['entries', 'ratings', 'progress', 'highlights'];

// Creates the demo account, or resets it: the same password (for this secret) and the same
// library every time. Runs as the owner, which row level security does not apply to.
export async function seedDemo(db: Kysely<unknown>, { password }: { password: string }) {
  const hash = await hashPassword(password);
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into users (id, name, email, email_verified)
      values (${DEMO.id}, ${DEMO.name}, ${DEMO.email}, true)
      on conflict (id) do nothing`.execute(trx);
    await sql`
      insert into accounts (id, account_id, provider_id, user_id, password, updated_at)
      values ('demo-credential', ${DEMO.id}, 'credential', ${DEMO.id}, ${hash}, now())
      on conflict (id) do update set password = excluded.password, updated_at = now()`.execute(trx);
    await sql`
      insert into read_only_users (user_id) values (${DEMO.id})
      on conflict do nothing`.execute(trx);

    for (const table of LIBRARY_TABLES) {
      await sql`delete from ${sql.table(table)} where user_id = ${DEMO.id}`.execute(trx);
    }
    for (const { item, history, rating, season, highlightedAt } of LIBRARY) {
      const workId = await saveWork(trx, { ...item, raw: { seededBy: 'demo' } });
      for (const [status, at] of history) {
        await sql`
          insert into entries (user_id, work_id, status, at)
          values (${DEMO.id}, ${workId}, ${status}, ${at})`.execute(trx);
      }
      if (rating !== undefined) {
        await sql`
          insert into ratings (user_id, work_id, rating)
          values (${DEMO.id}, ${workId}, ${rating})`.execute(trx);
      }
      if (season !== undefined) {
        await sql`
          insert into progress (user_id, work_id, season)
          values (${DEMO.id}, ${workId}, ${season})`.execute(trx);
      }
      if (highlightedAt !== undefined) {
        await sql`
          insert into highlights (user_id, work_id, at)
          values (${DEMO.id}, ${workId}, ${highlightedAt})`.execute(trx);
      }
    }
  });
}

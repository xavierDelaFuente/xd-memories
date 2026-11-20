import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearAttempts, countAttempt } from '../attempts';
import { migrateToLatest } from '../migrate';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
});

afterAll(async () => {
  await database?.stop();
});

const LIMIT = { max: 3, windowSeconds: 60 };

const attempts = async (key: string, times: number) => {
  const allowed: boolean[] = [];
  for (let i = 0; i < times; i++) allowed.push(await countAttempt(db, key, LIMIT));
  return allowed;
};

// As if the key's window had started this many seconds ago.
const startedAgo = (key: string, seconds: number) =>
  sql`
    update auth_attempts set window_start = now() - make_interval(secs => ${seconds})
    where key = ${key}`.execute(db);

const keys = async () => {
  const { rows } = await sql<{ key: string }>`select key from auth_attempts order by key`.execute(
    db,
  );
  return rows.map(({ key }) => key);
};

describe('countAttempt', () => {
  it('allows up to the limit within a window, then refuses', async () => {
    const allowed = await attempts('limit', 5);

    expect(allowed).toEqual([true, true, true, false, false]);
  });

  it('counts each key on its own', async () => {
    await attempts('mine', 3);

    const other = await countAttempt(db, 'theirs', LIMIT);

    expect(other).toBe(true);
  });

  it('allows again once the window has passed', async () => {
    await attempts('later', 3);
    await startedAgo('later', 60);

    const allowed = await attempts('later', 4);

    expect(allowed).toEqual([true, true, true, false]);
  });

  it('still refuses just before the window ends', async () => {
    await attempts('almost', 3);
    await startedAgo('almost', 59);

    const allowed = await countAttempt(db, 'almost', LIMIT);

    expect(allowed).toBe(false);
  });

  // Each attempt is one statement, so a burst sent all at once gets no more than the limit.
  it('lets no more than the limit through when attempts arrive at once', async () => {
    const allowed = await Promise.all(
      Array.from({ length: 10 }, () => countAttempt(db, 'burst', LIMIT)),
    );

    expect(allowed.filter(Boolean)).toHaveLength(3);
  });

  it('forgets keys whose window ended a day ago', async () => {
    await attempts('stale', 1);
    await startedAgo('stale', 24 * 60 * 60 + 1);

    await countAttempt(db, 'fresh', LIMIT);

    expect(await keys()).not.toContain('stale');
  });

  it('a key whose window ended a day ago counts again from one', async () => {
    await attempts('returning', 3);
    await startedAgo('returning', 24 * 60 * 60 + 1);

    const allowed = await attempts('returning', 4);

    expect(allowed).toEqual([true, true, true, false]);
  });
});

describe('clearAttempts', () => {
  it('starts the key over', async () => {
    await attempts('cleared', 3);
    await clearAttempts(db, 'cleared');

    const allowed = await attempts('cleared', 4);

    expect(allowed).toEqual([true, true, true, false]);
  });

  it('leaves other keys counted', async () => {
    await attempts('kept', 3);
    await clearAttempts(db, 'not-kept');

    const allowed = await countAttempt(db, 'kept', LIMIT);

    expect(allowed).toBe(false);
  });
});

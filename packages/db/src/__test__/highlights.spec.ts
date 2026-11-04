import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

// Like entries.spec: seeded as the owner, asserted as app_user with plain SQL, so the policies
// themselves are under test. A highlight is the one thing in a library others may read.
beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
  await sql`
    insert into users (id, name, email, email_verified) values
      ('alice', 'Alice', 'alice@example.com', false),
      ('bob', 'Bob', 'bob@example.com', false);
    insert into works (id, media_type, title) values
      ('w-dune', 'book', 'Dune'), ('w-matrix', 'movie', 'The Matrix');
    insert into highlights (user_id, work_id) values ('alice', 'w-dune');
  `.execute(db);
});

afterAll(async () => {
  await database?.stop();
});

const as = <T>(userId: string, query: string) =>
  withUser(db, userId, async (trx) => (await sql.raw<T>(query).execute(trx)).rows);

const alicesHighlights = async () => {
  const { rows } = await sql`
    select work_id from highlights where user_id = 'alice'`.execute(db);
  return rows;
};

it('any signed-in user reads another user’s highlights', async () => {
  const rows = await as('bob', `select user_id, work_id from highlights`);

  expect(rows).toEqual([{ user_id: 'alice', work_id: 'w-dune' }]);
});

describe('only the owner changes their highlights', () => {
  it('a user cannot highlight a work for another user', async () => {
    const inserted = as(
      'bob',
      `insert into highlights (user_id, work_id) values ('alice', 'w-matrix')`,
    );

    await expect(inserted).rejects.toThrow(/row-level security/);
  });

  it('a user cannot remove another user’s highlight', async () => {
    await as('bob', `delete from highlights where user_id = 'alice'`);

    const rows = await alicesHighlights();

    expect(rows).toEqual([{ work_id: 'w-dune' }]);
  });
});

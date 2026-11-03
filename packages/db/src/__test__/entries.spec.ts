import { STATUSES } from '@xd-memories/domain';
import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

// Seeded as the owner, which row level security does not apply to. Every assertion then runs
// as app_user through withUser, with plain SQL: a repository that filters by user would pass
// even if the policy were missing. Tests that write use their own user, so no test sees another's rows.
beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
  await sql`
    insert into users (id, name, email, email_verified) values
      ('alice', 'Alice', 'alice@example.com', false),
      ('bob', 'Bob', 'bob@example.com', false),
      ('carol', 'Carol', 'carol@example.com', false),
      ('dave', 'Dave', 'dave@example.com', false),
      ('erin', 'Erin', 'erin@example.com', false);
    insert into works (id, media_type, title) values
      ('w-dune', 'book', 'Dune'), ('w-matrix', 'movie', 'The Matrix');
    insert into entries (user_id, work_id, status) values
      ('alice', 'w-dune', 'done'), ('bob', 'w-matrix', 'want'), ('erin', 'w-dune', 'doing');
  `.execute(db);
});

afterAll(async () => {
  await database?.stop();
});

const as = <T>(userId: string, query: string) =>
  withUser(db, userId, async (trx) => (await sql.raw<T>(query).execute(trx)).rows);

const bobsEntryId = async () => {
  const { rows } = await sql<{ id: string }>`
    select id from entries where user_id = 'bob'`.execute(db);
  return rows[0]?.id;
};

describe('user A can never read user B’s entries', () => {
  it('a user lists only their own entries', async () => {
    const rows = await as('alice', 'select user_id, work_id, status from entries');

    expect(rows).toEqual([{ user_id: 'alice', work_id: 'w-dune', status: 'done' }]);
  });

  it('asking for another user’s entry by id finds nothing', async () => {
    const id = await bobsEntryId();

    const rows = await as('alice', `select * from entries where id = '${id}'`);

    expect(rows).toEqual([]);
  });
});

describe('user A can never write user B’s entries', () => {
  it('an entry without a user belongs to whoever adds it', async () => {
    await as('dave', `insert into entries (work_id, status) values ('w-matrix', 'want')`);

    const { rows } = await sql`
      select work_id, status from entries where user_id = 'dave'`.execute(db);

    expect(rows).toEqual([{ work_id: 'w-matrix', status: 'want' }]);
  });

  it('an entry added for another user is rejected', async () => {
    const act = () =>
      as(
        'alice',
        `insert into entries (user_id, work_id, status) values ('bob', 'w-dune', 'done')`,
      );

    await expect(act()).rejects.toThrow(/row-level security/);
  });

  it.each`
    change      | query
    ${'update'} | ${`update entries set status = 'done' where user_id = 'bob'`}
    ${'delete'} | ${`delete from entries where user_id = 'bob'`}
  `('entries are a log, so even a $change is denied', async ({ query }: { query: string }) => {
    const act = () => as('alice', query);

    await expect(act()).rejects.toThrow(/permission denied/);
  });
});

describe('entries', () => {
  it.each(STATUSES)('accept the status %s', async (status) => {
    const act = () =>
      as('carol', `insert into entries (work_id, status) values ('w-matrix', '${status}')`);

    await expect(act()).resolves.toEqual([]);
  });

  it('reject a status the domain does not know', async () => {
    const act = () =>
      as('carol', `insert into entries (work_id, status) values ('w-matrix', 'paused')`);

    await expect(act()).rejects.toThrow(/check constraint/);
  });

  it('must point at a stored work', async () => {
    const act = () =>
      as('carol', `insert into entries (work_id, status) values ('w-missing', 'want')`);

    await expect(act()).rejects.toThrow(/foreign key/);
  });

  it('are deleted with their user’s account', async () => {
    await sql`delete from users where id = 'erin'`.execute(db);

    const { rows } = await sql`select * from entries where user_id = 'erin'`.execute(db);

    expect(rows).toEqual([]);
  });
});

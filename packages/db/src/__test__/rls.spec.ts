import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

// A user-owned table that exists only in this spec: it proves the pattern before real tables use it.
beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
  await sql`
    create table notes (user_id text not null default app.user_id(), body text not null);
    alter table notes enable row level security;
    create policy own_notes on notes using (user_id = app.user_id()) with check (user_id = app.user_id());
    grant select, insert on notes to app_user;
    insert into notes (user_id, body) values ('alice', 'alice note'), ('bob', 'bob note');
  `.execute(db);
});

// If the container never started, there is nothing to stop; let the real start-up error speak.
afterAll(async () => {
  await database?.stop();
});

const notesSeen = (userId: string) =>
  withUser(db, userId, async (trx) => {
    const { rows } = await sql<{ body: string }>`select body from notes order by body`.execute(trx);
    return rows.map((row) => row.body);
  });

describe('withUser', () => {
  it('runs as app_user, a role that does not own the tables', async () => {
    const role = await withUser(db, 'alice', async (trx) => {
      const { rows } = await sql<{ role: string }>`select current_user as role`.execute(trx);
      return rows[0]?.role;
    });

    expect(role).toBe('app_user');
  });

  it('app.user_id() is the user it was given', async () => {
    const userId = await withUser(db, 'alice', async (trx) => {
      const { rows } = await sql<{ id: string }>`select app.user_id() as id`.execute(trx);
      return rows[0]?.id;
    });

    expect(userId).toBe('alice');
  });

  it('the user is forgotten when the transaction ends', async () => {
    await withUser(db, 'alice', async () => undefined);

    const { rows } = await sql<{ id: string | null }>`select app.user_id() as id`.execute(db);

    expect(rows[0]?.id).toBeNull();
  });

  it('users working at the same time never see each other’s id', async () => {
    const ids = await Promise.all(
      ['alice', 'bob', 'carol', 'dave'].map((userId) =>
        withUser(db, userId, async (trx) => {
          await sql`select pg_sleep(0.05)`.execute(trx);
          const { rows } = await sql<{ id: string }>`select app.user_id() as id`.execute(trx);
          return rows[0]?.id;
        }),
      ),
    );

    expect(ids).toEqual(['alice', 'bob', 'carol', 'dave']);
  });

  it('returns what the work returns', async () => {
    const result = await withUser(db, 'alice', async () => 42);

    expect(result).toBe(42);
  });

  it('an error inside rolls the work back and is rethrown', async () => {
    const act = () =>
      withUser(db, 'alice', async (trx) => {
        await sql`insert into notes (body) values ('never saved')`.execute(trx);
        throw new Error('boom');
      });

    await expect(act()).rejects.toThrow('boom');
  });

  it('nothing from a rolled-back transaction is saved', async () => {
    await withUser(db, 'alice', async (trx) => {
      await sql`insert into notes (body) values ('rolled back')`.execute(trx);
      throw new Error('boom');
    }).catch(() => undefined);

    const notes = await notesSeen('alice');

    expect(notes).not.toContain('rolled back');
  });

  it.each(['', '   '])(
    'a blank user id (%j) is refused before touching the database',
    async (userId) => {
      const act = () => withUser(db, userId, async () => undefined);

      await expect(act()).rejects.toThrow(/user id/);
    },
  );
});

describe('row level security through withUser', () => {
  it.each`
    userId     | notes
    ${'alice'} | ${['alice note']}
    ${'bob'}   | ${['bob note']}
    ${'eve'}   | ${[]}
  `(
    '$userId sees only their own rows',
    async ({ userId, notes }: { userId: string; notes: string[] }) => {
      const seen = await notesSeen(userId);

      expect(seen).toEqual(notes);
    },
  );

  it('a new row belongs to the current user by default', async () => {
    await withUser(db, 'carol', (trx) =>
      sql`insert into notes (body) values ('carol note')`.execute(trx),
    );

    const seen = await notesSeen('carol');

    expect(seen).toEqual(['carol note']);
  });

  it('a row cannot be written for someone else', async () => {
    const act = () =>
      withUser(db, 'eve', (trx) =>
        sql`insert into notes (user_id, body) values ('alice', 'forged')`.execute(trx),
      );

    await expect(act()).rejects.toThrow(/row-level security/);
  });
});

describe('app_user permissions', () => {
  it('can read the shared catalog', async () => {
    const act = () => withUser(db, 'alice', (trx) => sql`select count(*) from works`.execute(trx));

    await expect(act()).resolves.toMatchObject({ rows: [{ count: '0' }] });
  });

  it.each`
    case                     | statement
    ${'create a table'}      | ${sql`create table hijack (id int)`}
    ${'drop a table'}        | ${sql`drop table works`}
    ${'switch off RLS'}      | ${sql`alter table notes disable row level security`}
    ${'delete catalog rows'} | ${sql`delete from works`}
  `('cannot $case', async ({ statement }: { statement: ReturnType<typeof sql> }) => {
    const act = () => withUser(db, 'alice', (trx) => statement.execute(trx));

    await expect(act()).rejects.toThrow(/permission denied|must be owner/);
  });
});

import { createRating } from '@xd-memories/domain';
import type { Mail } from '@xd-memories/mail';
import { type Kysely, sql, type Transaction } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../auth';
import { DEMO, demoPassword, seedDemo } from '../demo';
import {
  changeStatus,
  highlight,
  highlightsOf,
  historyOf,
  isReadOnly,
  libraryOf,
  rate,
  reachSeason,
  unhighlight,
} from '../library';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

const SECRET = 'test-secret-that-is-at-least-32-characters';

beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
  await sql`
    insert into users (id, name, email, email_verified)
    values ('ana', 'Ana', 'ana@example.com', false)`.execute(db);
  await seedDemo(db, { password: demoPassword(SECRET) });
});

afterAll(async () => {
  await database?.stop();
});

const asDemo = <T>(work: Parameters<typeof withUser<unknown, T>>[2]) => withUser(db, DEMO.id, work);

const shownLibrary = async () =>
  (await asDemo(libraryOf)).map(({ title, mediaType, status, season, rating, highlighted }) => ({
    title,
    mediaType,
    status,
    season,
    rating,
    highlighted,
  }));

describe('the seeded demo library', () => {
  it('has a work of every media type, most recently changed first', async () => {
    const library = await shownLibrary();

    expect(library).toEqual([
      {
        title: 'Severance',
        mediaType: 'series',
        status: 'doing',
        season: 2,
        rating: 90,
        highlighted: false,
      },
      {
        title: 'Dune',
        mediaType: 'book',
        status: 'done',
        season: null,
        rating: 92,
        highlighted: true,
      },
      {
        title: 'OK Computer',
        mediaType: 'album',
        status: 'done',
        season: null,
        rating: 95,
        highlighted: true,
      },
      {
        title: 'The Matrix',
        mediaType: 'movie',
        status: 'want',
        season: null,
        rating: null,
        highlighted: false,
      },
    ]);
  });

  it('has a history: Dune went from want to done', async () => {
    const [dune] = (await asDemo(libraryOf)).filter(({ title }) => title === 'Dune');

    const history = await asDemo(historyOf);

    expect(
      history.filter(({ workId }) => workId === dune?.workId).map(({ status }) => status),
    ).toEqual(['want', 'doing', 'done']);
  });

  it('shows its highlights to other signed-in users', async () => {
    const seen = await withUser(db, 'ana', (trx) => highlightsOf(trx, DEMO.id));

    expect(seen.map(({ title }) => title)).toEqual(['Dune', 'OK Computer']);
  });

  it('is the same after seeding again: a reset, not a second copy', async () => {
    const before = { library: await shownLibrary(), history: await asDemo(historyOf) };
    await seedDemo(db, { password: demoPassword(SECRET) });

    const after = { library: await shownLibrary(), history: await asDemo(historyOf) };

    expect(after).toEqual(before);
  });
});

const outbox: Mail[] = [];
const auth = () =>
  createAuth({
    db,
    secret: SECRET,
    baseURL: 'http://localhost:3000',
    mailer: { send: async (mail) => void outbox.push(mail) },
  });

describe('signing in to the demo', () => {
  const signIn = (password: string) =>
    auth().api.signInEmail({ body: { email: DEMO.email, password } });

  it('works with the password derived from the app secret', async () => {
    const session = await signIn(demoPassword(SECRET));

    expect(session.user.id).toBe(DEMO.id);
  });

  it('fails with a password derived from any other secret', async () => {
    const session = signIn(demoPassword('another-secret-that-is-32-characters-long'));

    await expect(session).rejects.toThrow();
  });
});

// Its address is .invalid, so a mail could never arrive; none is even attempted.
it('asking to reset the demo password mails nothing', async () => {
  await auth().api.requestPasswordReset({
    body: { email: DEMO.email, redirectTo: '/reset-password' },
  });

  const mailed = outbox.filter(({ to }) => to === DEMO.email);

  expect(mailed).toEqual([]);
});

describe('the demo is read-only, whatever the app sends', () => {
  const rating = (value: number) => {
    const created = createRating(value);
    if (!created.ok) throw new Error(`${value} is not a rating`);
    return created.value;
  };
  const workTitled = async (title: string) => {
    const item = (await asDemo(libraryOf)).find((work) => work.title === title);
    if (!item) throw new Error(`${title} is not in the demo library`);
    return item.workId;
  };

  type Write = (trx: Transaction<unknown>, workId: string) => Promise<unknown>;

  // A first rating or season is an insert; a later one goes through the upsert's update.
  it.each`
    change              | title           | write
    ${'a status'}       | ${'Severance'}  | ${((trx, workId) => changeStatus(trx, { workId, status: 'done', at: new Date() })) satisfies Write}
    ${'a first rating'} | ${'The Matrix'} | ${((trx, workId) => rate(trx, { workId, rating: rating(10) })) satisfies Write}
    ${'a new rating'}   | ${'Severance'}  | ${((trx, workId) => rate(trx, { workId, rating: rating(10) })) satisfies Write}
    ${'a first season'} | ${'The Matrix'} | ${((trx, workId) => sql`insert into progress (work_id, season) values (${workId}, 1)`.execute(trx)) satisfies Write}
    ${'a new season'}   | ${'Severance'}  | ${((trx, workId) => reachSeason(trx, { workId, season: 5 })) satisfies Write}
    ${'a highlight'}    | ${'Severance'}  | ${((trx, workId) => highlight(trx, workId)) satisfies Write}
  `('refuses $change', async ({ title, write }: { title: string; write: Write }) => {
    const workId = await workTitled(title);

    const written = asDemo((trx) => write(trx, workId));

    await expect(written).rejects.toThrow(/row-level security/);
  });

  it('removes no highlight', async () => {
    const workId = await workTitled('Dune');
    await asDemo((trx) => unhighlight(trx, workId));

    const seen = await withUser(db, 'ana', (trx) => highlightsOf(trx, DEMO.id));

    expect(seen.map(({ title }) => title)).toContain('Dune');
  });

  it.each`
    table         | column      | value
    ${'ratings'}  | ${'rating'} | ${1}
    ${'progress'} | ${'season'} | ${9}
  `(
    'updates no $column in place',
    async ({ table, column, value }: { table: string; column: string; value: number }) => {
      await asDemo((trx) =>
        sql`update ${sql.table(table)} set ${sql.ref(column)} = ${value}`.execute(trx),
      );

      const { rows } = await sql`
        select count(*)::int as changed from ${sql.table(table)}
        where user_id = ${DEMO.id} and ${sql.ref(column)} = ${value}`.execute(db);

      expect(rows).toEqual([{ changed: 0 }]);
    },
  );

  it('reports itself read-only', async () => {
    const readOnly = await asDemo(isReadOnly);

    expect(readOnly).toBe(true);
  });

  it('leaves everyone else writable', async () => {
    const readOnly = await withUser(db, 'ana', isReadOnly);

    expect(readOnly).toBe(false);
  });
});

import type { CatalogItem } from '@xd-memories/domain';
import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { libraryOf, logEntry } from '../library';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { saveWork } from '../work-cache';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

const book = (externalId: string, title: string): CatalogItem => ({
  ref: { source: 'openlibrary', externalId },
  mediaType: 'book',
  title,
  creators: ['Frank Herbert'],
  year: 1965,
  sourceVersion: 'search.json',
  raw: {},
});

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

// Each test uses its own user, so no test sees another's library.
beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
  await sql`
    insert into users (id, name, email, email_verified)
    select id, id, id || '@example.com', false
    from unnest(array['ada', 'bea', 'cal', 'dan']) as id`.execute(db);
});

afterAll(async () => {
  await database?.stop();
});

const add = (userId: string, item: CatalogItem, status: 'want' | 'doing' | 'done', at: Date) =>
  withUser(db, userId, async (trx) => {
    const workId = await saveWork(trx, item);
    await logEntry(trx, { workId, status, at });
    return workId;
  });

const libraryFor = (userId: string) => withUser(db, userId, (trx) => libraryOf(trx));

describe('libraryOf', () => {
  it('lists an added work with what search showed and its status', async () => {
    const workId = await add('ada', book('works/OL1W', 'Dune'), 'want', day(1));

    const library = await libraryFor('ada');

    expect(library).toEqual([
      {
        workId,
        mediaType: 'book',
        title: 'Dune',
        creators: ['Frank Herbert'],
        year: 1965,
        status: 'want',
        at: day(1),
      },
    ]);
  });

  it('shows each work once, with its latest status', async () => {
    await add('bea', book('works/OL2W', 'Dune Messiah'), 'want', day(1));
    await add('bea', book('works/OL2W', 'Dune Messiah'), 'done', day(3));

    const library = await libraryFor('bea');

    expect(library.map(({ title, status }) => ({ title, status }))).toEqual([
      { title: 'Dune Messiah', status: 'done' },
    ]);
  });

  it('lists the most recently changed work first', async () => {
    await add('cal', book('works/OL3W', 'Children of Dune'), 'done', day(1));
    await add('cal', book('works/OL4W', 'God Emperor of Dune'), 'want', day(2));
    await add('cal', book('works/OL3W', 'Children of Dune'), 'doing', day(3));

    const library = await libraryFor('cal');

    expect(library.map(({ title }) => title)).toEqual(['Children of Dune', 'God Emperor of Dune']);
  });

  it('is empty for a user who added nothing, whatever others added', async () => {
    const library = await libraryFor('dan');

    expect(library).toEqual([]);
  });
});

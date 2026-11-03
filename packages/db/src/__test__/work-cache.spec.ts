import type { CatalogItem, WorkId } from '@xd-memories/domain';
import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { saveWork } from '../work-cache';
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

// Every test saves its own ref, so tests never see each other's works.
const item = (externalId: string, overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  ref: { source: 'openlibrary', externalId },
  mediaType: 'book',
  title: 'Dune',
  creators: ['Frank Herbert'],
  year: 1965,
  sourceVersion: 'search.json',
  raw: { key: `/${externalId}`, title: 'Dune' },
  ...overrides,
});

const save = (userId: string, cached: CatalogItem) =>
  withUser(db, userId, (trx) => saveWork(trx, cached));

describe('the first save of a catalog item', () => {
  it('stores the work as parsed', async () => {
    const workId = await save('alice', item('works/OL1W'));

    const { rows } = await sql`
      select media_type, title, creators, year from works where id = ${workId}`.execute(db);

    expect(rows).toEqual([
      { media_type: 'book', title: 'Dune', creators: ['Frank Herbert'], year: 1965 },
    ]);
  });

  it('stores its ref with the raw source payload and source version', async () => {
    const workId = await save('alice', item('works/OL2W'));

    const { rows } = await sql`
      select source, external_id, source_version, raw from external_refs
      where work_id = ${workId}`.execute(db);

    expect(rows).toEqual([
      {
        source: 'openlibrary',
        external_id: 'works/OL2W',
        source_version: 'search.json',
        raw: { key: '/works/OL2W', title: 'Dune' },
      },
    ]);
  });

  it('a year the source does not know is stored as null', async () => {
    const workId = await save('alice', item('works/OL3W', { year: null }));

    const { rows } = await sql`select year from works where id = ${workId}`.execute(db);

    expect(rows).toEqual([{ year: null }]);
  });
});

describe('a later save of the same ref', () => {
  it('by the same user reuses the WorkId', async () => {
    const first = await save('alice', item('works/OL10W'));

    const second = await save('alice', item('works/OL10W'));

    expect(second).toBe(first);
  });

  it('by anyone reuses the WorkId', async () => {
    const first = await save('alice', item('works/OL11W'));

    const second = await save('bob', item('works/OL11W'));

    expect(second).toBe(first);
  });

  it('keeps what the first save stored: refreshing the cache is the worker’s job', async () => {
    const workId = await save('alice', item('works/OL12W'));
    await save('bob', item('works/OL12W', { title: 'Dune (renamed)' }));

    const { rows } = await sql`select title from works where id = ${workId}`.execute(db);

    expect(rows).toEqual([{ title: 'Dune' }]);
  });

  // The interleaving two simultaneous requests can produce, made certain: Alice saves but holds
  // her transaction open until Bob, who could not see her uncommitted ref, waits on its row lock.
  const saveTwiceAtOnce = async (externalId: string, title = 'Dune') => {
    let bobs: Promise<WorkId> | undefined;
    const alices = await withUser(db, 'alice', async (trx) => {
      const workId = await saveWork(trx, item(externalId, { title }));
      bobs = save('bob', item(externalId, { title }));
      await vi.waitFor(
        async () => {
          const { rows } = await sql`
            select count(*)::int as waiting from pg_stat_activity
            where wait_event_type = 'Lock'`.execute(db);
          expect(rows).toEqual([{ waiting: 1 }]);
        },
        { timeout: 5_000, interval: 10 },
      );
      return workId;
    });
    return [alices, await bobs];
  };

  it('at the same moment from two requests gives both the same WorkId', async () => {
    const [alices, bobs] = await saveTwiceAtOnce('works/OL13W');

    expect(bobs).toBe(alices);
  });

  it('at the same moment from two requests stores one work, with no orphan', async () => {
    await saveTwiceAtOnce('works/OL14W', 'Dune, saved twice at once');

    const { rows } = await sql`
      select count(*)::int as works from works
      where title = 'Dune, saved twice at once'`.execute(db);

    expect(rows).toEqual([{ works: 1 }]);
  });
});

it('different refs make different works', async () => {
  const dune = await save('alice', item('works/OL20W'));

  const messiah = await save('alice', item('works/OL21W', { title: 'Dune Messiah' }));

  expect(messiah).not.toBe(dune);
});

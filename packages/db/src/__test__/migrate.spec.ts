import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateToLatest } from '../migrate';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;
let firstRun: string[];

beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  firstRun = await migrateToLatest(db);
});

// If the container never started, there is nothing to stop; let the real start-up error speak.
afterAll(async () => {
  await database?.stop();
});

const columnsOf = async (table: string) => {
  const { rows } = await sql<{ column_name: string }>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
    order by column_name`.execute(db);
  return rows.map((row) => row.column_name);
};

const work = (id: string) =>
  sql`insert into works (id, media_type, title) values (${id}, 'movie', 'The Matrix')`.execute(db);

const ref = (workId: string, externalId: string, source = 'tmdb') =>
  sql`insert into external_refs (work_id, source, external_id, source_version, raw)
      values (${workId}, ${source}, ${externalId}, '2026-10-30', '{}')`.execute(db);

const refsOf = async (workId: string) => {
  const { rows } = await sql<{ source: string; external_id: string }>`
    select source, external_id from external_refs
    where work_id = ${workId}
    order by source`.execute(db);
  return rows;
};

describe('migrateToLatest', () => {
  it('applies every migration to an empty database', () => {
    expect(firstRun).toEqual(['0001-catalog', '0002-app-user']);
  });

  it('applies nothing when the database is already up to date', async () => {
    const secondRun = await migrateToLatest(db);

    expect(secondRun).toEqual([]);
  });
});

describe('0001-catalog', () => {
  it.each`
    table              | columns
    ${'works'}         | ${['created_at', 'id', 'media_type', 'title']}
    ${'external_refs'} | ${['external_id', 'fetched_at', 'raw', 'source', 'source_version', 'work_id']}
  `('creates $table', async ({ table, columns }: { table: string; columns: string[] }) => {
    const actual = await columnsOf(table);

    expect(actual).toEqual(columns);
  });

  it('a work can have refs from several sources', async () => {
    await work('w-several');
    await ref('w-several', 'movie/603');

    await ref('w-several', 'Q83495', 'wikidata');
    const refs = await refsOf('w-several');

    expect(refs).toEqual([
      { source: 'tmdb', external_id: 'movie/603' },
      { source: 'wikidata', external_id: 'Q83495' },
    ]);
  });

  it('one source id belongs to one work only', async () => {
    await work('w-first');
    await work('w-second');
    await ref('w-first', 'movie/604');

    const act = () => ref('w-second', 'movie/604');

    await expect(act()).rejects.toThrow(/duplicate key/);
  });

  it('a ref must point at an existing work', async () => {
    const act = () => ref('w-missing', 'movie/605');

    await expect(act()).rejects.toThrow(/foreign key/);
  });

  it('media type is one of the domain media types', async () => {
    const act = () =>
      sql`insert into works (id, media_type, title) values ('w-podcast', 'podcast', 'X')`.execute(
        db,
      );

    await expect(act()).rejects.toThrow(/check constraint/);
  });

  it('a title cannot be blank', async () => {
    const act = () =>
      sql`insert into works (id, media_type, title) values ('w-blank', 'movie', '  ')`.execute(db);

    await expect(act()).rejects.toThrow(/check constraint/);
  });
});

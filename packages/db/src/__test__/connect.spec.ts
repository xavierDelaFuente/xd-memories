import { sql } from 'kysely';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { connect } from '../connect';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;

beforeAll(async () => {
  database = await startPostgres();
});

afterAll(async () => {
  await database?.stop();
});

it('connects to the database at a connection string', async () => {
  const db = connect(database.url);

  const { rows } = await sql<{ name: string }>`select current_database() as name`.execute(db);
  await db.destroy();

  expect(rows).toEqual([{ name: 'test' }]);
});

import { type Kysely, sql } from 'kysely';

// Works and where they came from. Checks repeat domain rules so data written outside the app
// (scripts, imports, manual fixes) cannot break them either.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('works')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('media_type', 'text', (col) =>
      col.notNull().check(sql`media_type in ('movie', 'series', 'book', 'album')`),
    )
    .addColumn('title', 'text', (col) => col.notNull().check(sql`btrim(title) <> ''`))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('external_refs')
    .addColumn('source', 'text', (col) => col.notNull())
    .addColumn('external_id', 'text', (col) => col.notNull())
    .addColumn('work_id', 'text', (col) => col.notNull().references('works.id'))
    .addColumn('source_version', 'text', (col) => col.notNull())
    .addColumn('raw', 'jsonb', (col) => col.notNull())
    .addColumn('fetched_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('external_refs_pkey', ['source', 'external_id'])
    .execute();

  await db.schema
    .createIndex('external_refs_work_id')
    .on('external_refs')
    .column('work_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('external_refs').execute();
  await db.schema.dropTable('works').execute();
}

import { type Kysely, sql } from 'kysely';

// The cover a source gave on the first save (cache-on-save), null when it gave none. It ends up as
// an image's address, so https only: never a script, never a mixed-content request. Works saved
// before this have none until the worker refreshes them.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table works add column cover text check (cover ~ '^https://[^/]+/');
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table works drop column cover`.execute(db);
}

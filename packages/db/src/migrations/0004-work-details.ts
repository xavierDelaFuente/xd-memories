import { type Kysely, sql } from 'kysely';

// What search shows next to a title, stored with the work on its first save (cache-on-save).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table works
      add column creators text[] not null default '{}',
      add column year integer check (year between 0 and 9999);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table works drop column creators, drop column year`.execute(db);
}

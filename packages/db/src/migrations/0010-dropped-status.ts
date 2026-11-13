import { type Kysely, sql } from 'kysely';

// A work given up on (PROJECT Open Question 11): one more status an entry can log. Like the others
// it isn't an end; a later entry can pick the work up again.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table entries drop constraint entries_status_check;
    alter table entries add constraint entries_status_check
      check (status in ('want', 'doing', 'done', 'dropped'));
  `.execute(db);
}

// Fails while any entry is dropped: going back would lose that history, so it has to be a choice.
export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table entries drop constraint entries_status_check;
    alter table entries add constraint entries_status_check
      check (status in ('want', 'doing', 'done'));
  `.execute(db);
}

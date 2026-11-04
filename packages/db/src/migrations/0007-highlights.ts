import { type Kysely, sql } from 'kysely';

// A work a user chose to show others: the one part of a library that is not private. Any
// signed-in user (app_user only exists inside withUser) may read every highlight; only the
// owner may add or remove theirs. Nothing else of the library — status, rating, history — is
// in this table, so nothing else is exposed.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table highlights (
      user_id text not null default app.user_id() references users (id) on delete cascade,
      work_id text not null references works (id),
      at timestamptz not null default now(),
      primary key (user_id, work_id)
    );

    alter table highlights enable row level security;
    create policy read_highlights on highlights for select using (true);
    create policy add_own_highlights on highlights for insert
      with check (user_id = app.user_id());
    create policy remove_own_highlights on highlights for delete
      using (user_id = app.user_id());

    grant select, insert, delete on highlights to app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table highlights`.execute(db);
}

import { type Kysely, sql } from 'kysely';

// How far a user got in a series: the season reached, at most one per series — recording it
// again replaces it (Open Question 2: a season; an episode may come later). Private like
// ratings. That the work is a series in the user's library is reachSeason's check.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table progress (
      user_id text not null default app.user_id() references users (id) on delete cascade,
      work_id text not null references works (id),
      season integer not null check (season >= 1),
      primary key (user_id, work_id)
    );

    alter table progress enable row level security;
    create policy own_progress on progress
      using (user_id = app.user_id())
      with check (user_id = app.user_id());

    grant select, insert, update on progress to app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table progress`.execute(db);
}

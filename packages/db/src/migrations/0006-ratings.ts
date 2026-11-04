import { type Kysely, sql } from 'kysely';

// A user's own 0–100 rating of a work, at most one each: rating again replaces it. Kept apart
// from anything a source rates. Row level security keeps every row private to its user; the
// check repeats the domain's range (createRating) so no caller can store an out-of-range value.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table ratings (
      user_id text not null default app.user_id() references users (id) on delete cascade,
      work_id text not null references works (id),
      rating double precision not null check (rating >= 0 and rating <= 100),
      primary key (user_id, work_id)
    );

    alter table ratings enable row level security;
    create policy own_ratings on ratings
      using (user_id = app.user_id())
      with check (user_id = app.user_id());

    grant select, insert, update on ratings to app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table ratings`.execute(db);
}

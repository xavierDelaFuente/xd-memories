import { type Kysely, sql } from 'kysely';

// A user's library as a log: each row is one status change for one work, and the latest row is
// the current status (logStatus in the domain). Row level security keeps every row private to
// its user; app_user can only read and append, so the log is never rewritten.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table entries (
      id uuid primary key default gen_random_uuid(),
      user_id text not null default app.user_id() references users (id) on delete cascade,
      work_id text not null references works (id),
      status text not null check (status in ('want', 'doing', 'done')),
      at timestamptz not null default now()
    );
    create index entries_user_work_at_idx on entries (user_id, work_id, at desc);

    alter table entries enable row level security;
    create policy own_entries on entries
      using (user_id = app.user_id())
      with check (user_id = app.user_id());

    grant select, insert on entries to app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table entries`.execute(db);
}

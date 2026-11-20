import { type Kysely, sql } from 'kysely';

// Attempts at sign-in, sign-up and password reset, counted per key (such as the path and the
// email) in a fixed window: attempts.ts. In Postgres, not in a server's memory, so every instance
// on Vercel counts the same attempts. Auth data: only the owner touches it, never app_user.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table auth_attempts (
      key text primary key,
      count integer not null,
      window_start timestamptz not null
    );

    create index auth_attempts_window_start_idx on auth_attempts (window_start);

    revoke all on auth_attempts from app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table auth_attempts`.execute(db);
}

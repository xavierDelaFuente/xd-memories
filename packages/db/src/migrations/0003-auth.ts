import { type Kysely, sql } from 'kysely';

// Better Auth's tables, as its own migration planner compiles them for our naming (see auth.ts).
// auth.spec.ts fails if this and Better Auth ever drift. Auth data (password hashes, session
// tokens) is never readable by app_user: only Better Auth, as the owner, touches it.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table users (
      id text not null primary key,
      name text not null,
      email text not null unique,
      email_verified boolean not null,
      image text,
      created_at timestamptz default current_timestamp not null,
      updated_at timestamptz default current_timestamp not null
    );

    create table sessions (
      id text not null primary key,
      expires_at timestamptz not null,
      token text not null unique,
      created_at timestamptz default current_timestamp not null,
      updated_at timestamptz not null,
      ip_address text,
      user_agent text,
      user_id text not null references users (id) on delete cascade
    );

    create table accounts (
      id text not null primary key,
      account_id text not null,
      provider_id text not null,
      user_id text not null references users (id) on delete cascade,
      access_token text,
      refresh_token text,
      id_token text,
      access_token_expires_at timestamptz,
      refresh_token_expires_at timestamptz,
      scope text,
      password text,
      created_at timestamptz default current_timestamp not null,
      updated_at timestamptz not null
    );

    create table verifications (
      id text not null primary key,
      identifier text not null,
      value text not null,
      expires_at timestamptz not null,
      created_at timestamptz default current_timestamp not null,
      updated_at timestamptz default current_timestamp not null
    );

    create index sessions_user_id_idx on sessions (user_id);
    create index accounts_user_id_idx on accounts (user_id);
    create index verifications_identifier_idx on verifications (identifier);

    revoke all on users, sessions, accounts, verifications from app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table verifications, accounts, sessions, users`.execute(db);
}

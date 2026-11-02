import { type Kysely, sql } from 'kysely';

// app_user is the role every request runs as (see withUser). It owns nothing, so row level
// security applies to it, and it cannot change the schema. It cannot log in: the connecting
// role switches to it inside a transaction.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create schema app;
    create function app.user_id() returns text language sql stable
      as $$ select nullif(current_setting('app.user_id', true), '') $$;

    do $$ begin
      if not exists (select from pg_roles where rolname = 'app_user') then
        create role app_user nologin;
      end if;
    end $$;
    grant app_user to current_user;

    grant usage on schema app, public to app_user;
    grant execute on function app.user_id() to app_user;
    grant select, insert on works, external_refs to app_user;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop owned by app_user;
    drop role app_user;
    drop schema app cascade;
  `.execute(db);
}

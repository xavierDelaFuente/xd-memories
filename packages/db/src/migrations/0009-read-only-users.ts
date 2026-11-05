import { type Kysely, sql } from 'kysely';

// Users who may read but never write their library: the demo account (seedDemo). Enforced here,
// not in the app: a restrictive policy on every write app_user can make, so a request from a
// read-only user changes nothing, whatever form it posts. app_user cannot read the list itself;
// app.is_read_only() answers for the signed-in user only.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table read_only_users (
      user_id text primary key references users (id) on delete cascade
    );

    create function app.is_read_only() returns boolean language sql stable
      security definer set search_path = ''
      as $$ select exists (select from public.read_only_users where user_id = app.user_id()) $$;
    grant execute on function app.is_read_only() to app_user;

    create policy read_only_insert on entries as restrictive for insert to app_user
      with check (not app.is_read_only());
    create policy read_only_insert on ratings as restrictive for insert to app_user
      with check (not app.is_read_only());
    create policy read_only_update on ratings as restrictive for update to app_user
      using (not app.is_read_only());
    create policy read_only_insert on progress as restrictive for insert to app_user
      with check (not app.is_read_only());
    create policy read_only_update on progress as restrictive for update to app_user
      using (not app.is_read_only());
    create policy read_only_insert on highlights as restrictive for insert to app_user
      with check (not app.is_read_only());
    create policy read_only_delete on highlights as restrictive for delete to app_user
      using (not app.is_read_only());
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop policy read_only_insert on entries;
    drop policy read_only_insert on ratings;
    drop policy read_only_update on ratings;
    drop policy read_only_insert on progress;
    drop policy read_only_update on progress;
    drop policy read_only_insert on highlights;
    drop policy read_only_delete on highlights;
    drop function app.is_read_only();
    drop table read_only_users;
  `.execute(db);
}

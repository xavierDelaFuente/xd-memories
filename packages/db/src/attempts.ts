import { type Kysely, sql } from 'kysely';

// At most `max` attempts per key in a window of `windowSeconds`, starting at the key's first one.
export type Limit = { max: number; windowSeconds: number };

// Counts an attempt and says whether it is within the limit. One statement, so attempts that
// arrive at once are counted one after another. It also forgets other keys whose window ended
// more than a day ago: the table stays small without a scheduled job.
export async function countAttempt(
  db: Kysely<unknown>,
  key: string,
  { max, windowSeconds }: Limit,
): Promise<boolean> {
  const { rows } = await sql<{ count: number }>`
    with pruned as (
      -- Never this key: Postgres does not say which of two changes to one row in one statement wins.
      delete from auth_attempts
      where window_start < now() - interval '1 day' and key <> ${key}
    )
    insert into auth_attempts as a (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when a.window_start <= now() - make_interval(secs => ${windowSeconds}) then 1
        else a.count + 1
      end,
      window_start = case
        when a.window_start <= now() - make_interval(secs => ${windowSeconds}) then now()
        else a.window_start
      end
    returning count`.execute(db);
  return (rows[0]?.count ?? Number.POSITIVE_INFINITY) <= max;
}

// Starts the key over, such as after a sign-in that succeeded.
export async function clearAttempts(db: Kysely<unknown>, key: string): Promise<void> {
  await sql`delete from auth_attempts where key = ${key}`.execute(db);
}

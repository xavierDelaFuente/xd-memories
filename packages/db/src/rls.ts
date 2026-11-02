import { type Kysely, sql, type Transaction } from 'kysely';

// The only way the app reaches user data: one transaction, run as app_user (row level security
// applies), with app.user_id() set to this user. Both settings end with the transaction, so a
// pooled connection never carries one user's identity into the next request.
export async function withUser<DB, T>(
  db: Kysely<DB>,
  userId: string,
  work: (trx: Transaction<DB>) => Promise<T>,
): Promise<T> {
  if (userId.trim() === '') throw new Error('withUser needs a user id');
  return db.transaction().execute(async (trx) => {
    await sql`set local role app_user`.execute(trx);
    await sql`select set_config('app.user_id', ${userId}, true)`.execute(trx);
    return work(trx);
  });
}

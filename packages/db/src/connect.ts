import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

// One pool per process. On Neon, use the pooled connection string: serverless functions open
// many short-lived connections.
export function connect(url: string): Kysely<unknown> {
  return new Kysely<unknown>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url }) }),
  });
}

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

// Postgres 17 is what Neon runs. One container per spec file; each spec gets its own database.
export type TestDatabase = {
  db: Kysely<unknown>;
  stop: () => Promise<void>;
};

export async function startPostgres(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:17-alpine',
  ).start();
  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: container.getConnectionUri() }),
    }),
  });
  return {
    db,
    stop: async () => {
      await db.destroy();
      await container.stop();
    },
  };
}

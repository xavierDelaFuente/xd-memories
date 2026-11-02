import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Kysely } from 'kysely';
import { connect } from '../connect';

// Postgres 17 is what Neon runs. One container per spec file; each spec gets its own database.
export type TestDatabase = {
  db: Kysely<unknown>;
  url: string;
  stop: () => Promise<void>;
};

export async function startPostgres(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:17-alpine',
  ).start();
  const url = container.getConnectionUri();
  const db = connect(url);
  return {
    db,
    url,
    stop: async () => {
      await db.destroy();
      await container.stop();
    },
  };
}

import type { Kysely } from 'kysely';
import { type Migration, Migrator } from 'kysely/migration';
import * as catalog from './migrations/0001-catalog';

// Listed in code, not read from a folder: migrations are type-checked and need no file paths at runtime.
// Names sort in apply order; never rename or edit one that has shipped — add a new one.
const MIGRATIONS: Record<string, Migration> = {
  '0001-catalog': catalog,
};

// A failed migration is a deploy error, not a domain outcome, so it throws.
export async function migrateToLatest(db: Kysely<unknown>): Promise<string[]> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => MIGRATIONS } });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) throw error;
  return results.map((result) => result.migrationName);
}

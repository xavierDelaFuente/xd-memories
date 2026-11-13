import type { Kysely } from 'kysely';
import { type Migration, Migrator } from 'kysely/migration';
import * as catalog from './migrations/0001-catalog';
import * as appUser from './migrations/0002-app-user';
import * as auth from './migrations/0003-auth';
import * as workDetails from './migrations/0004-work-details';
import * as entries from './migrations/0005-entries';
import * as ratings from './migrations/0006-ratings';
import * as highlights from './migrations/0007-highlights';
import * as progress from './migrations/0008-progress';
import * as readOnlyUsers from './migrations/0009-read-only-users';
import * as droppedStatus from './migrations/0010-dropped-status';

// Listed in code, not read from a folder: migrations are type-checked and need no file paths at runtime.
// Names sort in apply order; never rename or edit one that has shipped — add a new one.
const MIGRATIONS: Record<string, Migration> = {
  '0001-catalog': catalog,
  '0002-app-user': appUser,
  '0003-auth': auth,
  '0004-work-details': workDetails,
  '0005-entries': entries,
  '0006-ratings': ratings,
  '0007-highlights': highlights,
  '0008-progress': progress,
  '0009-read-only-users': readOnlyUsers,
  '0010-dropped-status': droppedStatus,
};

// A failed migration is a deploy error, not a domain outcome, so it throws.
export async function migrateToLatest(db: Kysely<unknown>): Promise<string[]> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => MIGRATIONS } });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) throw error;
  return results.map((result) => result.migrationName);
}

import { randomUUID } from 'node:crypto';
import type { CatalogItem, WorkId } from '@xd-memories/domain';
import { sql, type Transaction } from 'kysely';

// A catalog item as its source returned it: the parsed fields plus the raw payload.
export type CachedItem = CatalogItem & { sourceVersion: string; raw: unknown };

const UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === UNIQUE_VIOLATION;

async function workIdOf(db: Transaction<unknown>, { source, externalId }: CatalogItem['ref']) {
  const { rows } = await sql<{ work_id: WorkId }>`
    select work_id from external_refs
    where source = ${source} and external_id = ${externalId}`.execute(db);
  return rows[0]?.work_id;
}

// Cache-on-save: the first save of a ref, by anyone, stores the work; later saves reuse it.
// Run inside withUser. Two requests saving the same new ref at once both insert; the loser's
// ref collides on the primary key, its savepoint undoes its work too, and it reads the winner's.
export async function saveWork(db: Transaction<unknown>, item: CachedItem): Promise<WorkId> {
  const existing = await workIdOf(db, item.ref);
  if (existing !== undefined) return existing;

  const workId = randomUUID();
  await sql`savepoint save_work`.execute(db);
  try {
    await sql`
      insert into works (id, media_type, title, creators, year)
      values (${workId}, ${item.mediaType}, ${item.title}, ${[...item.creators]}, ${item.year})
    `.execute(db);
    await sql`
      insert into external_refs (source, external_id, work_id, source_version, raw)
      values (${item.ref.source}, ${item.ref.externalId}, ${workId}, ${item.sourceVersion},
              ${JSON.stringify(item.raw)}::jsonb)
    `.execute(db);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    await sql`rollback to savepoint save_work`.execute(db);
    const winner = await workIdOf(db, item.ref);
    if (winner === undefined) throw error;
    return winner;
  }
  await sql`release savepoint save_work`.execute(db);
  return workId;
}

import type { Entry, MediaType, Rating, Status, WorkId } from '@xd-memories/domain';
import { sql, type Transaction } from 'kysely';

export type LibraryItem = {
  workId: WorkId;
  mediaType: MediaType;
  title: string;
  creators: string[];
  year: number | null;
  status: Status;
  at: Date;
  rating: Rating | null;
};

// Appends one status change for the signed-in user (row level security fills in user_id).
export async function logEntry(db: Transaction<unknown>, { workId, status, at }: Entry) {
  await sql`insert into entries (work_id, status, at) values (${workId}, ${status}, ${at})`.execute(
    db,
  );
}

// Appends a status change for a work already in the signed-in user's library, and reports
// whether it did. The "already in" check runs under row level security, so it sees only this
// user's entries: a posted work id can't add a work the user never added.
export async function changeStatus(
  db: Transaction<unknown>,
  { workId, status, at }: Entry,
): Promise<boolean> {
  const { numAffectedRows } = await sql`
    insert into entries (work_id, status, at)
    select ${workId}, ${status}, ${at}
    where exists (select from entries where work_id = ${workId})`.execute(db);
  return numAffectedRows === 1n;
}

// Rates a work already in the signed-in user's library, replacing any earlier rating, and reports
// whether it did. Like changeStatus, the "already in" check sees only this user's entries.
export async function rate(
  db: Transaction<unknown>,
  { workId, rating }: { workId: WorkId; rating: Rating },
): Promise<boolean> {
  const { numAffectedRows } = await sql`
    insert into ratings (work_id, rating)
    select ${workId}, ${rating}
    where exists (select from entries where work_id = ${workId})
    on conflict (user_id, work_id) do update set rating = excluded.rating`.execute(db);
  return numAffectedRows === 1n;
}

// Every status change of the signed-in user, oldest first.
export async function historyOf(db: Transaction<unknown>): Promise<Entry[]> {
  const { rows } = await sql<Entry>`
    select work_id as "workId", status, at from entries order by at, id`.execute(db);
  return rows;
}

// The signed-in user's library: each work once, at its latest status, most recent first.
export async function libraryOf(db: Transaction<unknown>): Promise<LibraryItem[]> {
  const { rows } = await sql<LibraryItem>`
    select * from (
      select distinct on (e.work_id)
        e.work_id as "workId", w.media_type as "mediaType", w.title, w.creators, w.year,
        e.status, e.at, r.rating
      from entries e join works w on w.id = e.work_id
      left join ratings r on r.work_id = e.work_id
      order by e.work_id, e.at desc
    ) latest
    order by at desc`.execute(db);
  return rows;
}

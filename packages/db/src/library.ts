import type { Entry, MediaType, Status, WorkId } from '@xd-memories/domain';
import { sql, type Transaction } from 'kysely';

export type LibraryItem = {
  workId: WorkId;
  mediaType: MediaType;
  title: string;
  creators: string[];
  year: number | null;
  status: Status;
  at: Date;
};

// Appends one status change for the signed-in user (row level security fills in user_id).
export async function logEntry(db: Transaction<unknown>, { workId, status, at }: Entry) {
  await sql`insert into entries (work_id, status, at) values (${workId}, ${status}, ${at})`.execute(
    db,
  );
}

// The signed-in user's library: each work once, at its latest status, most recent first.
export async function libraryOf(db: Transaction<unknown>): Promise<LibraryItem[]> {
  const { rows } = await sql<LibraryItem>`
    select * from (
      select distinct on (e.work_id)
        e.work_id as "workId", w.media_type as "mediaType", w.title, w.creators, w.year,
        e.status, e.at
      from entries e join works w on w.id = e.work_id
      order by e.work_id, e.at desc
    ) latest
    order by at desc`.execute(db);
  return rows;
}

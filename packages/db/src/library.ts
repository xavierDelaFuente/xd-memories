import type { Entry, MediaType, Rating, Status, WorkId } from '@xd-memories/domain';
import { sql, type Transaction } from 'kysely';

export type LibraryItem = {
  workId: WorkId;
  mediaType: MediaType;
  title: string;
  creators: string[];
  year: number | null;
  cover: string | null;
  status: Status;
  at: Date;
  rating: Rating | null;
  highlighted: boolean;
  season: number | null;
  // How many times it was done: a done after an earlier done is a re-read.
  timesFinished: number;
};

// What others see of a highlighted work: the work alone, never its status, rating or history.
export type Highlight = Pick<LibraryItem, 'workId' | 'mediaType' | 'title' | 'creators' | 'year'>;

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

// Records the season reached in a series already in the signed-in user's library, replacing any
// season recorded before, and reports whether it did. Only a series has seasons.
export async function reachSeason(
  db: Transaction<unknown>,
  { workId, season }: { workId: WorkId; season: number },
): Promise<boolean> {
  const { numAffectedRows } = await sql`
    insert into progress (work_id, season)
    select ${workId}, ${season}
    where exists (select from entries where work_id = ${workId})
      and exists (select from works where id = ${workId} and media_type = 'series')
    on conflict (user_id, work_id) do update set season = excluded.season`.execute(db);
  return numAffectedRows === 1n;
}

// Highlights a work already in the signed-in user's library (the same "already in" check as
// changeStatus); highlighting it again changes nothing.
export async function highlight(db: Transaction<unknown>, workId: WorkId) {
  await sql`
    insert into highlights (work_id)
    select ${workId}
    where exists (select from entries where work_id = ${workId})
    on conflict (user_id, work_id) do nothing`.execute(db);
}

// Row level security limits the delete to the signed-in user's own highlight.
export async function unhighlight(db: Transaction<unknown>, workId: WorkId) {
  await sql`delete from highlights where work_id = ${workId}`.execute(db);
}

// A user's highlights, as any signed-in user sees them, most recently highlighted first.
export async function highlightsOf(db: Transaction<unknown>, userId: string): Promise<Highlight[]> {
  const { rows } = await sql<Highlight>`
    select w.id as "workId", w.media_type as "mediaType", w.title, w.creators, w.year
    from highlights h join works w on w.id = h.work_id
    where h.user_id = ${userId}
    order by h.at desc`.execute(db);
  return rows;
}

// Whether the signed-in user may only read (the demo). The database refuses their writes anyway;
// this lets the app hide controls that would fail.
export async function isReadOnly(db: Transaction<unknown>): Promise<boolean> {
  const { rows } = await sql<{ readOnly: boolean }>`
    select app.is_read_only() as "readOnly"`.execute(db);
  return rows.some(({ readOnly }) => readOnly);
}

// Every status change of the signed-in user, oldest first.
export async function historyOf(db: Transaction<unknown>): Promise<Entry[]> {
  const { rows } = await sql<Entry>`
    select work_id as "workId", status, at from entries order by at, id`.execute(db);
  return rows;
}

// Each of the signed-in user's works once, at its latest status, most recent first; or only the
// one asked for. Entries are the user's own (row level security), so a work no entry of theirs
// names isn't there.
async function latest(db: Transaction<unknown>, workId?: WorkId): Promise<LibraryItem[]> {
  const { rows } = await sql<LibraryItem>`
    select * from (
      select distinct on (e.work_id)
        e.work_id as "workId", w.media_type as "mediaType", w.title, w.creators, w.year, w.cover,
        e.status, e.at, r.rating, h.user_id is not null as highlighted,
        p.season,
        (select count(*)::int from entries d where d.work_id = e.work_id and d.status = 'done')
          as "timesFinished"
      from entries e join works w on w.id = e.work_id
      left join ratings r on r.work_id = e.work_id
      left join progress p on p.work_id = e.work_id
      -- Highlights are readable by everyone, so this one join names the user.
      left join highlights h on h.work_id = e.work_id and h.user_id = app.user_id()
      ${workId === undefined ? sql`` : sql`where e.work_id = ${workId}`}
      order by e.work_id, e.at desc
    ) latest
    order by at desc`.execute(db);
  return rows;
}

// The signed-in user's library: each work once, at its latest status, most recent first.
export const libraryOf = (db: Transaction<unknown>) => latest(db);

// Where a work came from: one ref per source that has it.
export type SourceRef = { source: string; externalId: string };

// One work of the signed-in user's library, as screen 1c shows it.
export type LibraryWork = LibraryItem & { sources: SourceRef[]; history: Entry[] };

// A work in the signed-in user's library, with its sources and every status they gave it, oldest
// first; undefined when it isn't in their library, whoever else has it.
export async function workOf(
  db: Transaction<unknown>,
  workId: WorkId,
): Promise<LibraryWork | undefined> {
  const [item] = await latest(db, workId);
  if (item === undefined) return undefined;
  const { rows: sources } = await sql<SourceRef>`
    select source, external_id as "externalId" from external_refs
    where work_id = ${workId} order by source, external_id`.execute(db);
  const { rows: history } = await sql<Entry>`
    select work_id as "workId", status, at from entries
    where work_id = ${workId} order by at, id`.execute(db);
  return { ...item, sources, history };
}

// A search result already in the signed-in user's library: the work it is and where they are with it.
export type InLibrary = SourceRef & { workId: WorkId; status: Status };

// Which of these search results are in the signed-in user's library, each with its latest status.
// Entries are the user's own (row level security), so a work only others have isn't listed.
export async function statusesOf(
  db: Transaction<unknown>,
  refs: SourceRef[],
): Promise<InLibrary[]> {
  const { rows } = await sql<InLibrary>`
    select r.source, r.external_id as "externalId", e.work_id as "workId", e.status
    from unnest(
      ${refs.map(({ source }) => source)}::text[],
      ${refs.map(({ externalId }) => externalId)}::text[]
    ) as wanted(source, external_id)
    join external_refs r using (source, external_id)
    join lateral (
      select work_id, status from entries
      where work_id = r.work_id order by at desc, id desc limit 1
    ) e on true
    order by r.source, r.external_id`.execute(db);
  return rows;
}

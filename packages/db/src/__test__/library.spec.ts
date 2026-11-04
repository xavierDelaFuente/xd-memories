import { type CatalogItem, createRating, type Rating } from '@xd-memories/domain';
import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  changeStatus,
  highlight,
  highlightsOf,
  historyOf,
  libraryOf,
  logEntry,
  rate,
  unhighlight,
} from '../library';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { saveWork } from '../work-cache';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

const book = (externalId: string, title: string): CatalogItem => ({
  ref: { source: 'openlibrary', externalId },
  mediaType: 'book',
  title,
  creators: ['Frank Herbert'],
  year: 1965,
  sourceVersion: 'search.json',
  raw: {},
});

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

// Each test uses its own user, so no test sees another's library.
beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
  await sql`
    insert into users (id, name, email, email_verified)
    select id, id, id || '@example.com', false
    from unnest(array[
      'ada', 'bea', 'cal', 'dan', 'eve', 'fay', 'gus', 'hal', 'ivy', 'jo', 'kim', 'lou',
      'max', 'ned', 'oli', 'pam', 'quin'
    ]) as id`.execute(db);
});

afterAll(async () => {
  await database?.stop();
});

const add = (userId: string, item: CatalogItem, status: 'want' | 'doing' | 'done', at: Date) =>
  withUser(db, userId, async (trx) => {
    const workId = await saveWork(trx, item);
    await logEntry(trx, { workId, status, at });
    return workId;
  });

const libraryFor = (userId: string) => withUser(db, userId, (trx) => libraryOf(trx));

describe('libraryOf', () => {
  it('lists an added work with what search showed and its status', async () => {
    const workId = await add('ada', book('works/OL1W', 'Dune'), 'want', day(1));

    const library = await libraryFor('ada');

    expect(library).toEqual([
      {
        workId,
        mediaType: 'book',
        title: 'Dune',
        creators: ['Frank Herbert'],
        year: 1965,
        status: 'want',
        at: day(1),
        rating: null,
        highlighted: false,
      },
    ]);
  });

  it('shows each work once, with its latest status', async () => {
    await add('bea', book('works/OL2W', 'Dune Messiah'), 'want', day(1));
    await add('bea', book('works/OL2W', 'Dune Messiah'), 'done', day(3));

    const library = await libraryFor('bea');

    expect(library.map(({ title, status }) => ({ title, status }))).toEqual([
      { title: 'Dune Messiah', status: 'done' },
    ]);
  });

  it('lists the most recently changed work first', async () => {
    await add('cal', book('works/OL3W', 'Children of Dune'), 'done', day(1));
    await add('cal', book('works/OL4W', 'God Emperor of Dune'), 'want', day(2));
    await add('cal', book('works/OL3W', 'Children of Dune'), 'doing', day(3));

    const library = await libraryFor('cal');

    expect(library.map(({ title }) => title)).toEqual(['Children of Dune', 'God Emperor of Dune']);
  });

  it('is empty for a user who added nothing, whatever others added', async () => {
    const library = await libraryFor('dan');

    expect(library).toEqual([]);
  });
});

describe('changeStatus', () => {
  const change = (userId: string, workId: string, status: 'want' | 'doing' | 'done', at: Date) =>
    withUser(db, userId, (trx) => changeStatus(trx, { workId, status, at }));

  it('appends an entry for a work in your library, which then shows the new status', async () => {
    const workId = await add('eve', book('works/OL5W', 'Dune'), 'want', day(1));
    await change('eve', workId, 'doing', day(2));

    const library = await libraryFor('eve');

    expect(library.map(({ status }) => status)).toEqual(['doing']);
  });

  it('reports that it changed a work in your library', async () => {
    const workId = await add('fay', book('works/OL6W', 'Dune'), 'want', day(1));

    const changed = await change('fay', workId, 'done', day(2));

    expect(changed).toBe(true);
  });

  it('adds nothing for a work that is only in someone else’s library', async () => {
    const workId = await add('ada', book('works/OL7W', 'Heretics of Dune'), 'want', day(1));

    const changed = await change('gus', workId, 'done', day(2));

    expect(changed).toBe(false);
  });
});

describe('historyOf', () => {
  it('lists every status change, oldest first', async () => {
    const workId = await add('fay', book('works/OL8W', 'Chapterhouse: Dune'), 'want', day(1));
    await withUser(db, 'fay', (trx) => changeStatus(trx, { workId, status: 'done', at: day(5) }));

    const history = await withUser(db, 'fay', (trx) => historyOf(trx));

    expect(history.filter((entry) => entry.workId === workId)).toEqual([
      { workId, status: 'want', at: day(1) },
      { workId, status: 'done', at: day(5) },
    ]);
  });
});

describe('rate', () => {
  const rating = (value: number): Rating => {
    const created = createRating(value);
    if (!created.ok) throw new Error(`${value} is not a rating`);
    return created.value;
  };
  const rateAs = (userId: string, workId: string, value: number) =>
    withUser(db, userId, (trx) => rate(trx, { workId, rating: rating(value) }));
  const ratingsOf = async (userId: string) =>
    (await libraryFor(userId)).map(({ title, rating }) => ({ title, rating }));

  it('keeps the rating exactly as given: rounding is for display', async () => {
    const workId = await add('hal', book('works/OL9W', 'Dune'), 'done', day(1));
    await rateAs('hal', workId, 87.5);

    const ratings = await ratingsOf('hal');

    expect(ratings).toEqual([{ title: 'Dune', rating: 87.5 }]);
  });

  it('replaces an earlier rating of the same work', async () => {
    const workId = await add('ivy', book('works/OL10W', 'Dune'), 'done', day(1));
    await rateAs('ivy', workId, 60);
    await rateAs('ivy', workId, 95);

    const ratings = await ratingsOf('ivy');

    expect(ratings).toEqual([{ title: 'Dune', rating: 95 }]);
  });

  it('reports that it rated a work in your library', async () => {
    const workId = await add('jo', book('works/OL11W', 'Dune'), 'want', day(1));

    const rated = await rateAs('jo', workId, 70);

    expect(rated).toBe(true);
  });

  it('rates nothing for a work that is only in someone else’s library', async () => {
    const workId = await add('ada', book('works/OL12W', 'Dune Messiah'), 'want', day(1));

    const rated = await rateAs('kim', workId, 70);

    expect(rated).toBe(false);
  });

  it('is private: someone else’s rating of the same work is not yours', async () => {
    const workId = await add('lou', book('works/OL13W', 'Dune'), 'done', day(1));
    await add('kim', book('works/OL13W', 'Dune'), 'done', day(1));
    await rateAs('kim', workId, 40);

    const ratings = await ratingsOf('lou');

    expect(ratings).toEqual([{ title: 'Dune', rating: null }]);
  });

  it('the database refuses a rating outside 0–100, whatever the caller checked', async () => {
    const workId = await add('jo', book('works/OL14W', 'Dune'), 'want', day(1));

    const rated = withUser(db, 'jo', (trx) => rate(trx, { workId, rating: 101 as Rating }));

    await expect(rated).rejects.toThrow(/ratings_rating_check/);
  });
});

describe('highlights', () => {
  const highlightAs = (userId: string, workId: string) =>
    withUser(db, userId, (trx) => highlight(trx, workId));
  const highlightsSeenBy = (viewerId: string, ownerId: string) =>
    withUser(db, viewerId, (trx) => highlightsOf(trx, ownerId));

  it('another signed-in user sees a highlighted work, and nothing else of the library', async () => {
    const workId = await add('max', book('works/OL20W', 'Dune'), 'done', day(1));
    await highlightAs('max', workId);

    const seen = await highlightsSeenBy('ned', 'max');

    expect(seen).toEqual([
      { workId, mediaType: 'book', title: 'Dune', creators: ['Frank Herbert'], year: 1965 },
    ]);
  });

  it('lists the most recently highlighted first', async () => {
    const dune = await add('oli', book('works/OL21W', 'Dune'), 'done', day(1));
    const messiah = await add('oli', book('works/OL22W', 'Dune Messiah'), 'done', day(2));
    await highlightAs('oli', messiah);
    await highlightAs('oli', dune);

    const seen = await highlightsSeenBy('oli', 'oli');

    expect(seen.map(({ title }) => title)).toEqual(['Dune', 'Dune Messiah']);
  });

  it('highlighting a work twice lists it once', async () => {
    const workId = await add('pam', book('works/OL23W', 'Dune'), 'done', day(1));
    await highlightAs('pam', workId);
    await highlightAs('pam', workId);

    const seen = await highlightsSeenBy('pam', 'pam');

    expect(seen.map(({ title }) => title)).toEqual(['Dune']);
  });

  it('highlights nothing for a work that is only in someone else’s library', async () => {
    const workId = await add('ada', book('works/OL24W', 'Children of Dune'), 'want', day(1));
    await highlightAs('quin', workId);

    const seen = await highlightsSeenBy('quin', 'quin');

    expect(seen).toEqual([]);
  });

  it('unhighlight removes it', async () => {
    const workId = await add('ned', book('works/OL25W', 'Dune'), 'done', day(1));
    await highlightAs('ned', workId);
    await withUser(db, 'ned', (trx) => unhighlight(trx, workId));

    const seen = await highlightsSeenBy('max', 'ned');

    expect(seen).toEqual([]);
  });

  it('your library marks the works you highlighted', async () => {
    const workId = await add('pam', book('works/OL26W', 'Heretics of Dune'), 'done', day(3));
    await highlightAs('pam', workId);

    const library = await libraryFor('pam');

    expect(library.find((item) => item.workId === workId)?.highlighted).toBe(true);
  });

  it('your library does not mark a work someone else highlighted', async () => {
    const workId = await add('quin', book('works/OL27W', 'Dune'), 'done', day(1));
    await add('oli', book('works/OL27W', 'Dune'), 'done', day(1));
    await highlightAs('oli', workId);

    const library = await libraryFor('quin');

    expect(library.map(({ highlighted }) => highlighted)).toEqual([false]);
  });
});

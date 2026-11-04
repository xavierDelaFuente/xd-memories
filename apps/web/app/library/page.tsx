import { historyOf, libraryOf, withUser } from '@xd-memories/db';
import { STATUSES } from '@xd-memories/domain';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession, getDb } from '../../lib/auth';
import { signOut } from '../../lib/auth-actions';
import { resultLabel } from '../../lib/catalog-search';
import {
  addHighlight,
  removeHighlight,
  updateRating,
  updateSeason,
  updateStatus,
} from '../../lib/library-actions';
import { historyLabel, libraryLabel, STATUS_LABELS } from '../../lib/library-view';

export default async function LibraryPage() {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const { library, history } = await withUser(getDb(), session.user.id, async (trx) => ({
    library: await libraryOf(trx),
    history: await historyOf(trx),
  }));

  return (
    <>
      <h1>Library</h1>
      <p>
        Signed in as {session.user.email} ·{' '}
        <Link href={`/people/${session.user.id}`}>Your highlights</Link>
      </p>
      {library.length === 0 ? (
        <p>
          Nothing here yet. Search <Link href="/catalog/movies">movies</Link>,{' '}
          <Link href="/catalog/series">series</Link>, <Link href="/catalog/books">books</Link> or{' '}
          <Link href="/catalog/albums">albums</Link> to add something.
        </p>
      ) : (
        <ul aria-label="Your library">
          {library.map((item) => {
            const work = resultLabel(item);
            return (
              <li key={item.workId}>
                <h2>{libraryLabel(item)}</h2>
                <form action={updateStatus}>
                  <input type="hidden" name="workId" value={item.workId} />
                  <select
                    name="status"
                    aria-label={`Status for ${work}`}
                    defaultValue={item.status}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" aria-label={`Update ${work}`}>
                    Update
                  </button>
                </form>
                {item.mediaType === 'series' && (
                  <form action={updateSeason}>
                    <input type="hidden" name="workId" value={item.workId} />
                    <input
                      type="number"
                      name="season"
                      min={1}
                      step={1}
                      required
                      aria-label={`Season reached in ${work}`}
                      defaultValue={item.season ?? ''}
                    />
                    <button type="submit" aria-label={`Save season for ${work}`}>
                      Save season
                    </button>
                  </form>
                )}
                <form action={updateRating}>
                  <input type="hidden" name="workId" value={item.workId} />
                  <input
                    type="number"
                    name="rating"
                    min={0}
                    max={100}
                    step="any"
                    required
                    aria-label={`Rating for ${work}`}
                    defaultValue={item.rating ?? ''}
                  />
                  <button type="submit" aria-label={`Rate ${work}`}>
                    Rate
                  </button>
                </form>
                <form action={item.highlighted ? removeHighlight : addHighlight}>
                  <input type="hidden" name="workId" value={item.workId} />
                  {item.highlighted ? (
                    <button type="submit" aria-label={`Remove highlight from ${work}`}>
                      Remove highlight
                    </button>
                  ) : (
                    <button type="submit" aria-label={`Highlight ${work}`}>
                      Highlight
                    </button>
                  )}
                </form>
                <details>
                  <summary>History</summary>
                  <ol aria-label={`History of ${work}`}>
                    {history
                      .filter((entry) => entry.workId === item.workId)
                      .map((entry) => (
                        <li key={`${entry.at.toISOString()}-${entry.status}`}>
                          {historyLabel(entry)}
                        </li>
                      ))}
                  </ol>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}

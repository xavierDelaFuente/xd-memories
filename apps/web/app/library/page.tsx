import { Alert } from '@asnewyla/alert';
import { Button } from '@asnewyla/button';
import { Input } from '@asnewyla/input';
import { ToggleGroup, ToggleGroupItem } from '@asnewyla/toggle-group';
import { historyOf, isReadOnly, libraryOf, withUser } from '@xd-memories/db';
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
import {
  libraryFilter,
  libraryMediaLinks,
  ratingLabel,
  rowMeta,
  shownItems,
  statusTabs,
} from '../../lib/library-filter';
import { historyLabel, statusLabel } from '../../lib/library-view';
import { MediaTag } from '../../lib/media-tag';

type Props = {
  searchParams: Promise<{ media?: string | string[]; status?: string | string[] }>;
};

// Screen 1i: the media as chips, the statuses as tabs with counts, then one row per work.
export default async function LibraryPage({ searchParams }: Props) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const { library, history, readOnly } = await withUser(getDb(), session.user.id, async (trx) => ({
    library: await libraryOf(trx),
    history: await historyOf(trx),
    readOnly: await isReadOnly(trx),
  }));
  const filter = libraryFilter(library, await searchParams);
  const rows = shownItems(library, filter);

  return (
    <>
      <h1>Library</h1>
      <p>
        Signed in as {session.user.email} ·{' '}
        <Link href={`/people/${session.user.id}`}>Your highlights</Link>
      </p>
      {readOnly && (
        <Alert tone="info" announce={false}>
          This is the demo library: look around, nothing can be changed.{' '}
          <Link href="/sign-up">Create an account</Link> to keep your own.
        </Alert>
      )}
      {library.length === 0 ? (
        <p className="empty">
          Nothing here yet. Search <Link href="/catalog/movies">movies</Link>,{' '}
          <Link href="/catalog/series">series</Link>, <Link href="/catalog/books">books</Link> or{' '}
          <Link href="/catalog/albums">music</Link> to add something.
        </p>
      ) : (
        <>
          <nav aria-label="Filter by media" className="chips">
            <ul>
              {libraryMediaLinks(filter).map(({ href, label, current }) => (
                <li key={href}>
                  <Link href={href} aria-current={current ? 'page' : undefined}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Filter by status" className="tabs">
            <ul>
              {statusTabs(library, filter).map(({ href, label, current, count }) => (
                <li key={href}>
                  <Link href={href} aria-current={current ? 'page' : undefined}>
                    {label} <span className="count">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {rows.length === 0 ? (
            <p className="empty">None here yet.</p>
          ) : (
            <ul aria-label="Your library" className="rows">
              {rows.map((item) => {
                const work = resultLabel(item);
                const meta = rowMeta(item);
                return (
                  <li key={item.workId} className="row">
                    <h2>{item.title}</h2>
                    <p className="row-meta">
                      <MediaTag mediaType={item.mediaType} />
                      {meta !== '' && ` · ${meta}`}
                    </p>
                    <p className="row-marks">
                      {item.rating !== null && (
                        <span className="rating">{ratingLabel(item.rating)}</span>
                      )}
                      {item.highlighted && <span className="highlighted">Highlighted</span>}
                    </p>
                    {!readOnly && (
                      <details className="row-edit">
                        <summary aria-label={`Edit ${work}`}>Edit</summary>
                        {/* The current status doesn't submit: a stray tap would log it again,
                            which the history reads as a re-read. */}
                        <form action={updateStatus}>
                          <input type="hidden" name="workId" value={item.workId} />
                          <ToggleGroup
                            aria-label={`Status for ${work}`}
                            name="status"
                            value={item.status}
                            size="sm"
                          >
                            {STATUSES.map((status) => (
                              <ToggleGroupItem
                                key={status}
                                value={status}
                                type={status === item.status ? 'button' : 'submit'}
                              >
                                {statusLabel(status, item.mediaType)}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        </form>
                        <div className="entry-fields">
                          {item.mediaType === 'series' && (
                            <form action={updateSeason} className="entry-field">
                              <input type="hidden" name="workId" value={item.workId} />
                              <Input
                                label="Season"
                                className="number-field"
                                type="number"
                                name="season"
                                min={1}
                                step={1}
                                required
                                aria-label={`Season reached in ${work}`}
                                defaultValue={item.season === null ? '' : String(item.season)}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                aria-label={`Save season for ${work}`}
                              >
                                Save season
                              </Button>
                            </form>
                          )}
                          <form action={updateRating} className="entry-field">
                            <input type="hidden" name="workId" value={item.workId} />
                            <Input
                              label="Rating"
                              className="number-field"
                              type="number"
                              name="rating"
                              min={0}
                              max={100}
                              step="any"
                              required
                              aria-label={`Rating for ${work}`}
                              defaultValue={item.rating === null ? '' : String(item.rating)}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              aria-label={`Rate ${work}`}
                            >
                              Rate
                            </Button>
                          </form>
                        </div>
                        <form action={item.highlighted ? removeHighlight : addHighlight}>
                          <input type="hidden" name="workId" value={item.workId} />
                          {item.highlighted ? (
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              aria-label={`Remove highlight from ${work}`}
                            >
                              Remove highlight
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              aria-label={`Highlight ${work}`}
                            >
                              Highlight
                            </Button>
                          )}
                        </form>
                      </details>
                    )}
                    <details>
                      <summary>History</summary>
                      <ol aria-label={`History of ${work}`}>
                        {history
                          .filter((entry) => entry.workId === item.workId)
                          .map((entry) => (
                            <li key={`${entry.at.toISOString()}-${entry.status}`}>
                              {historyLabel(entry, item.mediaType)}
                            </li>
                          ))}
                      </ol>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </>
  );
}

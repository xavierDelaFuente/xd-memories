import { Alert } from '@asnewyla/alert';
import { Button } from '@asnewyla/button';
import { Card } from '@asnewyla/card';
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
import { historyLabel, libraryLabel, statusLabel } from '../../lib/library-view';
import { MediaTag } from '../../lib/media-tag';

export default async function LibraryPage() {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const { library, history, readOnly } = await withUser(getDb(), session.user.id, async (trx) => ({
    library: await libraryOf(trx),
    history: await historyOf(trx),
    readOnly: await isReadOnly(trx),
  }));

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
          <Link href="/catalog/albums">albums</Link> to add something.
        </p>
      ) : (
        <ul aria-label="Your library" className="card-list">
          {library.map((item) => {
            const work = resultLabel(item);
            return (
              <li key={item.workId}>
                <Card padding="md" radius="md" className="entry">
                  <MediaTag mediaType={item.mediaType} />
                  <h2>{libraryLabel(item)}</h2>
                  {!readOnly && (
                    <>
                      {/* The current status doesn't submit: a stray tap would log it again, which
                          the history reads as a re-read. */}
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
                    </>
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
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </>
  );
}

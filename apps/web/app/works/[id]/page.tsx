import { Button } from '@asnewyla/button';
import { Input } from '@asnewyla/input';
import { ToggleGroup, ToggleGroupItem } from '@asnewyla/toggle-group';
import { isReadOnly, withUser, workOf } from '@xd-memories/db';
import { goNumber, STATUSES } from '@xd-memories/domain';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentSession, getDb } from '../../../lib/auth';
import { resultLabel } from '../../../lib/catalog-search';
import { Cover } from '../../../lib/cover';
import {
  addHighlight,
  removeHighlight,
  updateRating,
  updateSeason,
  updateStatus,
} from '../../../lib/library-actions';
import { mediaShelf, ratingLabel, rowMeta } from '../../../lib/library-filter';
import { datesLabel, goLabel, historyLabel, statusLabel } from '../../../lib/library-view';
import { MediaTag } from '../../../lib/media-tag';
import { sourceLink } from '../../../lib/work-sources';

type Props = { params: Promise<{ id: string }> };

// Screen 1c: one work of your library. Its cover and where it came from; then what you've done
// with it, changed here: status, rating, season reached, highlight. Sagas (Phase 5) and related
// works (Phase 7) join it later.
export default async function WorkPage({ params }: Props) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const { id } = await params;
  const { work, readOnly } = await withUser(getDb(), session.user.id, async (trx) => ({
    work: await workOf(trx, id),
    readOnly: await isReadOnly(trx),
  }));
  if (work === undefined) notFound();

  const label = resultLabel(work);
  const shelf = mediaShelf(work.mediaType);
  const meta = rowMeta({ creators: [], year: work.year, season: work.season });
  const usesTmdb = work.sources.some(({ source }) => source === 'tmdb');
  const go = goLabel(goNumber(work.history), work.mediaType);

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <Link href="/library">Library</Link>
          </li>
          <li>
            <Link href={shelf.href}>{shelf.label}</Link>
          </li>
          <li aria-current="page">{work.title}</li>
        </ol>
      </nav>
      <article className="work">
        <div className="work-aside">
          <Cover src={work.cover} mediaType={work.mediaType} />
          <h2 id="sources" className="label">
            Sources
          </h2>
          <ul aria-labelledby="sources" className="sources">
            {work.sources.map(sourceLink).map(({ name, href }) => (
              <li key={`${name} ${href}`}>{href === null ? name : <a href={href}>{name}</a>}</li>
            ))}
          </ul>
        </div>
        <div className="work-main">
          <p className="work-meta">
            <MediaTag mediaType={work.mediaType} />
            {meta !== '' && ` · ${meta}`}
          </p>
          <h1>{work.title}</h1>
          {work.creators.length > 0 && <p className="work-by">by {work.creators.join(', ')}</p>}

          <section aria-label="Your entry" className="work-entry">
            {readOnly ? (
              <p className="work-status">{statusLabel(work.status, work.mediaType)}</p>
            ) : (
              // The current status doesn't submit: a stray tap would log it again, which the
              // history reads as a re-read.
              <form action={updateStatus}>
                <input type="hidden" name="workId" value={work.workId} />
                <ToggleGroup
                  aria-label={`Status for ${label}`}
                  name="status"
                  value={work.status}
                  size="sm"
                >
                  {STATUSES.map((status) => (
                    <ToggleGroupItem
                      key={status}
                      value={status}
                      type={status === work.status ? 'button' : 'submit'}
                    >
                      {statusLabel(status, work.mediaType)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </form>
            )}
            <p className="work-marks">
              {go !== '' && <span className="go">{go}</span>}
              {work.rating !== null && <span className="rating">{ratingLabel(work.rating)}</span>}
              {readOnly && work.highlighted && <span className="highlighted">Highlighted</span>}
            </p>
            <p className="work-dates">{datesLabel(work.history)}</p>
            {!readOnly && (
              <div className="entry-fields">
                <form action={updateRating} className="entry-field">
                  <input type="hidden" name="workId" value={work.workId} />
                  <Input
                    label="Rating"
                    className="number-field"
                    type="number"
                    name="rating"
                    min={0}
                    max={100}
                    step="any"
                    required
                    aria-label={`Rating for ${label}`}
                    defaultValue={work.rating === null ? '' : String(work.rating)}
                  />
                  <Button type="submit" size="sm" variant="outline" aria-label={`Rate ${label}`}>
                    Rate
                  </Button>
                </form>
                {work.mediaType === 'series' && (
                  <form action={updateSeason} className="entry-field">
                    <input type="hidden" name="workId" value={work.workId} />
                    <Input
                      label="Season"
                      className="number-field"
                      type="number"
                      name="season"
                      min={1}
                      step={1}
                      required
                      aria-label={`Season reached in ${label}`}
                      defaultValue={work.season === null ? '' : String(work.season)}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      aria-label={`Save season for ${label}`}
                    >
                      Save season
                    </Button>
                  </form>
                )}
                <form action={work.highlighted ? removeHighlight : addHighlight}>
                  <input type="hidden" name="workId" value={work.workId} />
                  {work.highlighted ? (
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      aria-label={`Remove highlight from ${label}`}
                    >
                      Remove highlight
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      aria-label={`Highlight ${label}`}
                    >
                      Highlight
                    </Button>
                  )}
                </form>
              </div>
            )}
          </section>

          <section aria-labelledby="history" className="work-history">
            <h2 id="history">History</h2>
            <ol aria-label={`History of ${label}`}>
              {work.history.map((entry) => (
                <li key={`${entry.at.toISOString()}-${entry.status}`}>
                  {historyLabel(entry, work.mediaType)}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>

      {usesTmdb && (
        <footer className="credit">
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </footer>
      )}
    </>
  );
}

import { Alert } from '@asnewyla/alert';
import { Button } from '@asnewyla/button';
import { isReadOnly, libraryOf, withUser } from '@xd-memories/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession, getDb } from '../../lib/auth';
import { signOut } from '../../lib/auth-actions';
import { Cover } from '../../lib/cover';
import {
  libraryFilter,
  libraryMediaLinks,
  ratingLabel,
  rowMeta,
  shownItems,
  statusTabs,
  workHref,
} from '../../lib/library-filter';
import { MediaTag } from '../../lib/media-tag';

type Props = {
  searchParams: Promise<{ media?: string | string[]; status?: string | string[] }>;
};

// Screen 1i: the media as chips, the statuses as tabs with counts, then one row per work.
export default async function LibraryPage({ searchParams }: Props) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const { library, readOnly } = await withUser(getDb(), session.user.id, async (trx) => ({
    library: await libraryOf(trx),
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
                const meta = rowMeta(item);
                return (
                  <li key={item.workId} className="row">
                    <Cover src={item.cover} mediaType={item.mediaType} />
                    <h2>
                      <Link href={workHref(item.workId)}>{item.title}</Link>
                    </h2>
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
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <div className="account-actions">
        <Link href="/account">Account</Link>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}

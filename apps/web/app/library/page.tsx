import { libraryOf, withUser } from '@xd-memories/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession, getDb } from '../../lib/auth';
import { signOut } from '../../lib/auth-actions';
import { libraryLabel } from '../../lib/library-view';

export default async function LibraryPage() {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const library = await withUser(getDb(), session.user.id, (trx) => libraryOf(trx));

  return (
    <>
      <h1>Library</h1>
      <p>Signed in as {session.user.email}</p>
      {library.length === 0 ? (
        <p>
          Nothing here yet. Search <Link href="/catalog/movies">movies</Link>,{' '}
          <Link href="/catalog/series">series</Link>, <Link href="/catalog/books">books</Link> or{' '}
          <Link href="/catalog/albums">albums</Link> to add something.
        </p>
      ) : (
        <ul aria-label="Your library">
          {library.map((item) => (
            <li key={item.workId}>{libraryLabel(item)}</li>
          ))}
        </ul>
      )}
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}

import { redirect } from 'next/navigation';
import { currentSession } from '../../lib/auth';
import { signOut } from '../../lib/auth-actions';

export default async function LibraryPage() {
  const session = await currentSession();
  if (!session) redirect('/sign-in');

  return (
    <>
      <h1>Library</h1>
      <p>Signed in as {session.user.email}</p>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}

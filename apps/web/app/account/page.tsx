import { isReadOnly, withUser } from '@xd-memories/db';
import { redirect } from 'next/navigation';
import { currentSession, getDb } from '../../lib/auth';
import { deleteMyAccount } from '../../lib/auth-actions';
import { AuthForm } from '../../lib/auth-form';

export default async function AccountPage() {
  const session = await currentSession();
  if (session === null) redirect('/sign-in');
  const readOnly = await withUser(getDb(), session.user.id, (trx) => isReadOnly(trx));

  return (
    <>
      <h1>Account</h1>
      <p>
        {session.user.name} · {session.user.email}
      </p>
      <section aria-labelledby="delete-account" className="danger">
        <h2 id="delete-account">Delete your account</h2>
        {readOnly ? (
          <p>The demo account can’t be deleted: everyone who tries the demo shares it.</p>
        ) : (
          <>
            <p>
              This deletes your account and your whole library: statuses, ratings, seasons and
              highlights. It can’t be undone. Works you added stay in the shared catalog, without
              your name.
            </p>
            <AuthForm
              action={deleteMyAccount}
              submit="Delete my account"
              password="current-password"
            />
          </>
        )}
      </section>
    </>
  );
}

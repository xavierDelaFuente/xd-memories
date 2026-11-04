import { highlightsOf, withUser } from '@xd-memories/db';
import { redirect } from 'next/navigation';
import { currentSession, getDb } from '../../../lib/auth';
import { resultLabel } from '../../../lib/catalog-search';

type Props = { params: Promise<{ id: string }> };

// A user's highlights, for any signed-in user: the works alone, nothing else of the library.
// An unknown id reads the same as a user with no highlights, so the page never says who exists.
export default async function PersonPage({ params }: Props) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  const { id } = await params;
  const highlights = await withUser(getDb(), session.user.id, (trx) => highlightsOf(trx, id));

  return (
    <>
      <h1>{id === session.user.id ? 'Your highlights' : 'Highlights'}</h1>
      {highlights.length === 0 ? (
        <p>No highlights yet.</p>
      ) : (
        <ul aria-label="Highlights">
          {highlights.map((work) => (
            <li key={work.workId}>
              <h2>{resultLabel(work)}</h2>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

import { Button } from '@asnewyla/button';
import { type LibraryItem, libraryOf, withUser } from '@xd-memories/db';
import Link from 'next/link';
import { currentSession, getDb } from '../lib/auth';
import { tryDemo } from '../lib/auth-actions';
import { Cover } from '../lib/cover';
import { continueItems, continueMeta } from '../lib/for-you';
import { workHref } from '../lib/library-filter';
import { MediaTag } from '../lib/media-tag';

// Signed in, home is For you (screens 1a, 1h); signed out, it says what the app is.
export default async function Home() {
  const session = await currentSession();
  if (session === null) return <Welcome />;

  const library = await withUser(getDb(), session.user.id, (trx) => libraryOf(trx));
  return <ForYou items={continueItems(library)} />;
}

function Welcome() {
  return (
    <>
      <h1>xd-memories</h1>
      <p>The movies, series, books and albums you want, are into, and have finished.</p>
      <form action={tryDemo}>
        <Button type="submit">Try the demo</Button>
      </form>
      <p>
        <Link href="/sign-up">Create an account</Link> or <Link href="/sign-in">sign in</Link>.
      </p>
    </>
  );
}

// Only Continue for now: the sections of later phases (sagas, groups) appear with them, not
// as empty headings.
function ForYou({ items }: { items: LibraryItem[] }) {
  return (
    <>
      <h1>For you</h1>
      <section aria-labelledby="continue" className="for-you">
        <h2 id="continue" className="section-heading">
          Continue {items.length > 0 && <span className="count">{items.length} in progress</span>}
        </h2>
        {items.length === 0 ? (
          <p className="empty">
            Nothing in progress. <Link href="/catalog/movies">Browse</Link> for something to start.
          </p>
        ) : (
          <ul aria-label="Continue" className="continue">
            {items.map((item) => (
              <li key={item.workId} className="continue-card">
                <Cover src={item.cover} mediaType={item.mediaType} />
                <div>
                  <p className="continue-media">
                    <MediaTag mediaType={item.mediaType} />
                  </p>
                  <h3>
                    <Link href={workHref(item.workId)}>{item.title}</Link>
                  </h3>
                  <p className="work-meta">{continueMeta(item)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

import { Alert } from '@asnewyla/alert';
import { Button } from '@asnewyla/button';
import { Input } from '@asnewyla/input';
import { isReadOnly, statusesOf, withUser } from '@xd-memories/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToLibrary } from '../../../lib/add-to-library';
import { appSecret, currentSession, getDb } from '../../../lib/auth';
import { inLibrary, messageFor, resultLabel, searchCatalog } from '../../../lib/catalog-search';
import { catalogSource } from '../../../lib/catalog-source';
import { Cover } from '../../../lib/cover';
import { rowMeta, workHref } from '../../../lib/library-filter';
import { statusLabel } from '../../../lib/library-view';
import { mediaLinks } from '../../../lib/media-links';
import { signItem } from '../../../lib/signed-item';

type Props = {
  params: Promise<{ media: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function CatalogPage({ params, searchParams }: Props) {
  const { media } = await params;
  const { q } = await searchParams;
  const view = await searchCatalog({ media, q }, catalogSource());
  if (view.kind === 'not-found') notFound();
  // Signed in, a result already in your library shows where you are with it and links to its page.
  // Any other result can be added: it goes to the browser signed, so it comes back as it left.
  // Not in the read-only demo, where adding would fail.
  const session = await currentSession();
  const mine =
    session === null
      ? null
      : await withUser(getDb(), session.user.id, async (trx) => ({
          readOnly: await isReadOnly(trx),
          found:
            view.kind === 'results'
              ? await statusesOf(
                  trx,
                  view.items.map(({ ref }) => ref),
                )
              : [],
        }));
  const signing = mine !== null && !mine.readOnly ? { secret: appSecret(), now: new Date() } : null;

  const query = view.kind === 'idle' ? null : view.query;
  const usesTmdb = view.mediaType === 'movie' || view.mediaType === 'series';

  return (
    <>
      <h1>Catalog</h1>
      <nav aria-label="Media" className="media chips">
        <ul>
          {mediaLinks(view.mediaType, query).map(({ href, label, current }) => (
            <li key={href}>
              <Link href={href} aria-current={current ? 'page' : undefined}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <search className="catalog-search">
        <form action={`/catalog/${media}`}>
          <Input label={`Search ${media}`} name="q" type="search" defaultValue={query ?? ''} />
          <Button type="submit">Search</Button>
        </form>
      </search>

      {view.kind === 'results' &&
        (view.items.length === 0 ? (
          <p className="empty">
            No {media} match “{view.query}”. Check the spelling, or try fewer words.
          </p>
        ) : (
          <ul aria-label="Results" className="cover-grid">
            {view.items.map((item) => {
              const entry = mine === null ? undefined : inLibrary(mine.found, item.ref);
              return (
                <li key={`${item.ref.source}:${item.ref.externalId}`}>
                  <Cover src={item.cover} mediaType={item.mediaType} />
                  <h2>
                    {entry ? <Link href={workHref(entry.workId)}>{item.title}</Link> : item.title}
                  </h2>
                  <p className="work-meta">{rowMeta({ ...item, season: null })}</p>
                  {entry ? (
                    <p className="in-library">
                      In your library · {statusLabel(entry.status, item.mediaType)}
                    </p>
                  ) : (
                    signing && (
                      <AddToLibrary
                        item={signItem(item, signing)}
                        label={resultLabel(item)}
                        mediaType={item.mediaType}
                      />
                    )
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {view.kind === 'error' && <Alert tone="error">{messageFor(view.error)}</Alert>}

      {usesTmdb && (
        <footer className="credit">
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </footer>
      )}
    </>
  );
}

import { Alert } from '@asnewyla/alert';
import { Button } from '@asnewyla/button';
import { Card } from '@asnewyla/card';
import { Input } from '@asnewyla/input';
import { isReadOnly, withUser } from '@xd-memories/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToLibrary } from '../../../lib/add-to-library';
import { appSecret, currentSession, getDb } from '../../../lib/auth';
import { mediaLinks, messageFor, resultLabel, searchCatalog } from '../../../lib/catalog-search';
import { catalogSource } from '../../../lib/catalog-source';
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
  // Signed in, each result can be added: it goes to the browser signed, so it comes back as it left.
  // Not in the read-only demo, where adding would fail.
  const session = await currentSession();
  const canAdd =
    session !== null && !(await withUser(getDb(), session.user.id, (trx) => isReadOnly(trx)));
  const signing = canAdd ? { secret: appSecret(), now: new Date() } : null;

  const query = view.kind === 'idle' ? null : view.query;
  const usesTmdb = view.mediaType === 'movie' || view.mediaType === 'series';

  return (
    <>
      <h1>Catalog</h1>
      <nav aria-label="Media" className="media">
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
          <ul aria-label="Results" className="card-list">
            {view.items.map((item) => (
              <li key={`${item.ref.source}:${item.ref.externalId}`}>
                <Card padding="md" radius="md" className="entry">
                  <h2>{resultLabel(item)}</h2>
                  {signing && (
                    <AddToLibrary
                      item={signItem(item, signing)}
                      label={resultLabel(item)}
                      mediaType={item.mediaType}
                    />
                  )}
                </Card>
              </li>
            ))}
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

import { notFound } from 'next/navigation';
import { messageFor, resultLabel, searchCatalog } from '../../../lib/catalog-search';
import { catalogSource } from '../../../lib/catalog-source';

type Props = {
  params: Promise<{ media: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function CatalogPage({ params, searchParams }: Props) {
  const { media } = await params;
  const { q } = await searchParams;
  const view = await searchCatalog({ media, q }, catalogSource());
  if (view.kind === 'not-found') notFound();

  const usesTmdb = view.mediaType === 'movie' || view.mediaType === 'series';

  return (
    <>
      <h1>Catalog</h1>
      <search>
        <form action={`/catalog/${media}`}>
          <label htmlFor="q">Search {media}</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={view.kind === 'idle' ? '' : view.query}
          />
          <button type="submit">Search</button>
        </form>
      </search>

      {view.kind === 'results' &&
        (view.items.length === 0 ? (
          <p>
            No {media} match “{view.query}”.
          </p>
        ) : (
          <ul aria-label="Results">
            {view.items.map((item) => (
              <li key={`${item.ref.source}:${item.ref.externalId}`}>{resultLabel(item)}</li>
            ))}
          </ul>
        ))}

      {view.kind === 'error' && <p role="alert">{messageFor(view.error)}</p>}

      {usesTmdb && (
        <footer>
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </footer>
      )}
    </>
  );
}

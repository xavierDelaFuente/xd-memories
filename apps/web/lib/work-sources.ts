// Where a work came from: the source's name, and the work's page on the source's own site. A
// source with no page known (the E2E fixtures) is named, unlinked.
export type SourceLink = { name: string; href: string | null };

// Each site ends in a slash: whatever an id says, it lands on a page of that site.
const SITES: Record<string, { name: string; site: string }> = {
  tmdb: { name: 'TMDB', site: 'https://www.themoviedb.org/' },
  openlibrary: { name: 'Open Library', site: 'https://openlibrary.org/' },
  musicbrainz: { name: 'MusicBrainz', site: 'https://musicbrainz.org/' },
};

export function sourceLink({
  source,
  externalId,
}: {
  source: string;
  externalId: string;
}): SourceLink {
  const known = Object.hasOwn(SITES, source) ? SITES[source] : undefined;
  if (known === undefined) return { name: source, href: null };
  // Appended, not resolved: resolving "//elsewhere" against the site would leave it.
  return { name: known.name, href: `${known.site}${externalId}` };
}

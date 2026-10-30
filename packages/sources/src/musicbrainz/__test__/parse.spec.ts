import { describe, expect, it } from 'vitest';
import { unwrap } from '../../__test__/helpers';
import albumSearch from '../fixtures/search-ok-computer.json' with { type: 'json' };
import { parseAlbumSearch } from '../parse';

describe('parseAlbumSearch (recorded MusicBrainz response)', () => {
  it('parses a release group into an album keyed on its MBID', () => {
    const items = unwrap(parseAlbumSearch(albumSearch));

    expect(items[0]).toEqual({
      ref: {
        source: 'musicbrainz',
        externalId: 'release-group/b1392450-e666-3926-a536-22c65f834433',
      },
      mediaType: 'album',
      title: 'OK Computer',
      creators: ['Radiohead'],
      year: 1997,
    });
  });

  it('keeps MusicBrainz order (best match first)', () => {
    const items = unwrap(parseAlbumSearch(albumSearch));

    expect(items.slice(0, 3).map((item) => item.title)).toEqual([
      'OK Computer',
      'OK Computer (8-bit)',
      'OK Computer Part 2',
    ]);
  });

  it('parses every release group on the page', () => {
    const items = unwrap(parseAlbumSearch(albumSearch));

    expect(items).toHaveLength(albumSearch['release-groups'].length);
  });

  it('an empty page is an empty list', () => {
    const items = unwrap(parseAlbumSearch({ count: 0, 'release-groups': [] }));

    expect(items).toEqual([]);
  });

  const mbid = 'b1392450-e666-3926-a536-22c65f834433';

  it('keeps every credited artist, in credit order', () => {
    const [album] = unwrap(
      parseAlbumSearch({
        'release-groups': [
          {
            id: mbid,
            title: 'Collab',
            'artist-credit': [{ name: 'Lemaitre', joinphrase: ' & ' }, { name: 'RebMoe' }],
          },
        ],
      }),
    );

    expect(album?.creators).toEqual(['Lemaitre', 'RebMoe']);
  });

  it('a release group with no artist credit has no creators', () => {
    const [album] = unwrap(
      parseAlbumSearch({ 'release-groups': [{ id: mbid, title: 'Unknown' }] }),
    );

    expect(album?.creators).toEqual([]);
  });

  it('a release group with no first release date has no year', () => {
    const [album] = unwrap(
      parseAlbumSearch({ 'release-groups': [{ id: mbid, title: 'Undated' }] }),
    );

    expect(album?.year).toBeNull();
  });
});

describe('malformed responses are typed errors, never casts or crashes', () => {
  const invalid = { ok: false, error: { kind: 'InvalidResponse', detail: expect.any(String) } };
  const mbid = 'b1392450-e666-3926-a536-22c65f834433';

  it.each`
    case                                   | payload
    ${'null'}                              | ${null}
    ${'no release-groups field'}           | ${{ count: 0 }}
    ${'release-groups that is not a list'} | ${{ 'release-groups': 'nope' }}
    ${'a release group without a title'}   | ${{ 'release-groups': [{ id: mbid }] }}
    ${'an id that is not text'}            | ${{ 'release-groups': [{ id: 42, title: 'OK Computer' }] }}
    ${'an artist credit without a name'}   | ${{ 'release-groups': [{ id: mbid, title: 'OK Computer', 'artist-credit': [{ joinphrase: '' }] }] }}
    ${'an id that is not an MBID'}         | ${{ 'release-groups': [{ id: 'ok-computer', title: 'OK Computer' }] }}
  `('$case', ({ payload }: { payload: unknown }) => {
    const result = parseAlbumSearch(payload);

    expect(result).toEqual(invalid);
  });
});

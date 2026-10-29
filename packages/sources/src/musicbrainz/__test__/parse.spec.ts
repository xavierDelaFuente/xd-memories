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
    ${'an id that is not an MBID'}         | ${{ 'release-groups': [{ id: 'ok-computer', title: 'OK Computer' }] }}
  `('$case', ({ payload }: { payload: unknown }) => {
    const result = parseAlbumSearch(payload);

    expect(result).toEqual(invalid);
  });
});

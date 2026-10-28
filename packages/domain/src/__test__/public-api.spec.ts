import { expect, it } from 'vitest';
import * as domain from '../index';

it('exposes exactly the intended runtime API, so adding or dropping an export is deliberate', () => {
  expect(Object.keys(domain).sort()).toEqual([
    'MEDIA_TYPES',
    'addCredit',
    'addOrdering',
    'createCreator',
    'createRating',
    'createSeries',
    'createWork',
    'displayRating',
    'emptyWorkIndex',
    'err',
    'inMemoryCatalog',
    'logStatus',
    'normalizeRating',
    'ok',
    'orderingNamed',
    'progress',
    'resolveRef',
  ]);
});

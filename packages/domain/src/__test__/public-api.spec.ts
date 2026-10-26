import { expect, it } from 'vitest';
import * as domain from '../index';

it('exposes exactly the intended runtime API, so adding or dropping an export is deliberate', () => {
  expect(Object.keys(domain).sort()).toEqual([
    'addCredit',
    'addOrdering',
    'createCreator',
    'createRating',
    'createSeries',
    'createWork',
    'displayRating',
    'emptyWorkIndex',
    'err',
    'logStatus',
    'normalizeRating',
    'ok',
    'orderingNamed',
    'progress',
    'resolveRef',
  ]);
});

import { describe, expect, it } from 'vitest';
import { createRating, displayRating, normalizeRating } from '../rating';
import { unwrap } from './helpers';

type Scale = { value: number; min: number; max: number };

describe('createRating', () => {
  it.each([0, 50, 100])('accepts %i', (value) => {
    const result = createRating(value);

    expect(result).toEqual({ ok: true, value });
  });

  it('keeps decimals internally', () => {
    const result = createRating(74.25);

    expect(result).toEqual({ ok: true, value: 74.25 });
  });

  it.each([-1, 101, -0.01, 100.01])('rejects %d as a typed error, without throwing', (value) => {
    const result = createRating(value);

    expect(result).toEqual({ ok: false, error: { kind: 'RatingOutOfRange', value } });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects %d, which is not a usable number',
    (value) => {
      const result = createRating(value);

      expect(result).toEqual({ ok: false, error: { kind: 'RatingOutOfRange', value } });
    },
  );
});

describe('normalizeRating', () => {
  it.each`
    value  | min    | max    | expected
    ${1}   | ${0}   | ${5}   | ${20}
    ${1}   | ${1}   | ${5}   | ${0}
    ${5}   | ${1}   | ${5}   | ${100}
    ${3}   | ${1}   | ${5}   | ${50}
    ${3.7} | ${1}   | ${5}   | ${67.5}
    ${7.8} | ${0}   | ${10}  | ${78}
    ${85}  | ${0}   | ${100} | ${85}
    ${0}   | ${-10} | ${10}  | ${50}
  `(
    '$value on $min–$max is $expected',
    ({ value, min, max, expected }: Scale & { expected: number }) => {
      const rating = unwrap(normalizeRating({ value, min, max }));

      expect(rating).toBeCloseTo(expected);
    },
  );

  it.each`
    min    | max
    ${0}   | ${5}
    ${1}   | ${10}
    ${-10} | ${10}
  `('maps the bottom of $min–$max to 0', ({ min, max }: Omit<Scale, 'value'>) => {
    const rating = unwrap(normalizeRating({ value: min, min, max }));

    expect(rating).toBe(0);
  });

  it.each`
    min    | max
    ${0}   | ${5}
    ${1}   | ${10}
    ${-10} | ${10}
  `('maps the top of $min–$max to 100', ({ min, max }: Omit<Scale, 'value'>) => {
    const rating = unwrap(normalizeRating({ value: max, min, max }));

    expect(rating).toBe(100);
  });

  it.each`
    value | min  | max
    ${0}  | ${1} | ${5}
    ${6}  | ${1} | ${5}
  `('rejects $value outside its own $min–$max scale', (input: Scale) => {
    const result = normalizeRating(input);

    expect(result).toEqual({ ok: false, error: { kind: 'ValueOutsideScale', ...input } });
  });

  it.each`
    value | min  | max
    ${3}  | ${5} | ${5}
    ${3}  | ${5} | ${1}
  `('rejects a scale whose max is not above its min ($min–$max)', (input: Scale) => {
    const result = normalizeRating(input);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'InvalidScale', min: input.min, max: input.max },
    });
  });
});

describe('displayRating', () => {
  it.each`
    stored   | shown
    ${74.25} | ${74}
    ${74.5}  | ${75}
    ${99.6}  | ${100}
    ${0}     | ${0}
  `(
    'shows $stored as the whole number $shown',
    ({ stored, shown }: { stored: number; shown: number }) => {
      const rating = unwrap(createRating(stored));

      const displayed = displayRating(rating);

      expect(displayed).toBe(shown);
    },
  );
});

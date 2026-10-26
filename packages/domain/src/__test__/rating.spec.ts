import { describe, expect, it } from 'vitest';
import { createRating, displayRating, normalizeRating } from '../rating';

const unwrap = <T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T => {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
};

describe('createRating', () => {
  it.each([0, 50, 100])('accepts %i', (value) => {
    expect(createRating(value)).toEqual({ ok: true, value });
  });

  it('keeps decimals internally', () => {
    expect(createRating(74.25)).toEqual({ ok: true, value: 74.25 });
  });

  it.each([-1, 101, -0.01, 100.01])('rejects %d as a typed error, without throwing', (value) => {
    expect(createRating(value)).toEqual({
      ok: false,
      error: { kind: 'RatingOutOfRange', value },
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects %d, which is not a usable number',
    (value) => {
      expect(createRating(value).ok).toBe(false);
    },
  );
});

describe('normalizeRating', () => {
  it('on a scale with a zero, 1 of 5 is 20', () => {
    expect(unwrap(normalizeRating({ value: 1, min: 0, max: 5 }))).toBe(20);
  });

  it('on a scale without a zero, 1 of 5 is 0', () => {
    expect(unwrap(normalizeRating({ value: 1, min: 1, max: 5 }))).toBe(0);
  });

  it.each([
    { value: 5, min: 1, max: 5, expected: 100 },
    { value: 3, min: 1, max: 5, expected: 50 },
    { value: 7.8, min: 0, max: 10, expected: 78 },
    { value: 85, min: 0, max: 100, expected: 85 },
  ])('$value on $min–$max is $expected', ({ value, min, max, expected }) => {
    expect(unwrap(normalizeRating({ value, min, max }))).toBeCloseTo(expected);
  });

  it('keeps decimals: 3.7 of 1–5 is 67.5', () => {
    expect(unwrap(normalizeRating({ value: 3.7, min: 1, max: 5 }))).toBeCloseTo(67.5);
  });

  it.each([
    { value: 0, min: 1, max: 5 },
    { value: 6, min: 1, max: 5 },
  ])('rejects $value outside its own $min–$max scale', (input) => {
    expect(normalizeRating(input)).toEqual({
      ok: false,
      error: { kind: 'ValueOutsideScale', ...input },
    });
  });

  it.each([
    { value: 3, min: 5, max: 5 },
    { value: 3, min: 5, max: 1 },
  ])('rejects a scale whose max is not above its min ($min–$max)', (input) => {
    expect(normalizeRating(input)).toEqual({
      ok: false,
      error: { kind: 'InvalidScale', min: input.min, max: input.max },
    });
  });
});

describe('displayRating', () => {
  it.each([
    { stored: 74.25, shown: 74 },
    { stored: 74.5, shown: 75 },
    { stored: 99.6, shown: 100 },
    { stored: 0, shown: 0 },
  ])('shows $stored as the whole number $shown', ({ stored, shown }) => {
    expect(displayRating(unwrap(createRating(stored)))).toBe(shown);
  });
});

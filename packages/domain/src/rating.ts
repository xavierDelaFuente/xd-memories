import type { Result } from './result';

export type Rating = number & { readonly __brand: 'Rating' };

export type RatingError = { kind: 'RatingOutOfRange'; value: number };

export type SourceScore = { value: number; min: number; max: number };

export type NormalizeError =
  | ({ kind: 'ValueOutsideScale' } & SourceScore)
  | { kind: 'InvalidScale'; min: number; max: number };

export function createRating(value: number): Result<Rating, RatingError> {
  if (!(value >= 0 && value <= 100)) {
    return { ok: false, error: { kind: 'RatingOutOfRange', value } };
  }
  return { ok: true, value: value as Rating };
}

export function normalizeRating({ value, min, max }: SourceScore): Result<Rating, NormalizeError> {
  if (!(max > min)) {
    return { ok: false, error: { kind: 'InvalidScale', min, max } };
  }
  if (!(value >= min && value <= max)) {
    return { ok: false, error: { kind: 'ValueOutsideScale', value, min, max } };
  }
  return { ok: true, value: (((value - min) * 100) / (max - min)) as Rating };
}

export const displayRating = (rating: Rating): number => Math.round(rating);

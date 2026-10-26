import { err, ok, type Result } from './result';

export type Rating = number & { readonly __brand: 'Rating' };

export type RatingError = { kind: 'RatingOutOfRange'; value: number };

export type SourceScore = { value: number; min: number; max: number };

export type NormalizeError =
  | ({ kind: 'ValueOutsideScale' } & SourceScore)
  | { kind: 'InvalidScale'; min: number; max: number };

export function createRating(value: number): Result<Rating, RatingError> {
  if (!(value >= 0 && value <= 100)) return err({ kind: 'RatingOutOfRange', value });
  return ok(value as Rating);
}

export function normalizeRating({ value, min, max }: SourceScore): Result<Rating, NormalizeError> {
  if (!(max > min)) return err({ kind: 'InvalidScale', min, max });
  if (!(value >= min && value <= max)) return err({ kind: 'ValueOutsideScale', value, min, max });
  return ok((((value - min) * 100) / (max - min)) as Rating);
}

export const displayRating = (rating: Rating): number => Math.round(rating);

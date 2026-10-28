import { err, ok, type Result } from './result';
import { nonBlank } from './text';

export type WorkId = string;

export const MEDIA_TYPES = ['movie', 'series', 'book', 'album'] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

export type Work = { id: WorkId; mediaType: MediaType; title: string };

export type WorkInput = { id: WorkId; mediaType: string; title: string };

export type WorkError = { kind: 'BlankTitle' } | { kind: 'UnknownMediaType'; mediaType: string };

const isMediaType = (value: string): value is MediaType =>
  (MEDIA_TYPES as readonly string[]).includes(value);

export function createWork({ id, mediaType, title }: WorkInput): Result<Work, WorkError> {
  const trimmed = nonBlank(title);
  if (trimmed === undefined) return err({ kind: 'BlankTitle' });
  if (!isMediaType(mediaType)) return err({ kind: 'UnknownMediaType', mediaType });
  return ok({ id, mediaType, title: trimmed });
}

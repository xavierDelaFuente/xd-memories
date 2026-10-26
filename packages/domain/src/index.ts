// Pure domain. No I/O: no HTTP, no database, no filesystem, no clock, no random.
export { type Entry, type LogStatusInput, logStatus, type Status } from './entry';
export {
  type ExternalRef,
  emptyWorkIndex,
  type ResolvedRef,
  resolveRef,
  type WorkIndex,
} from './external-ref';
export {
  addOrdering,
  createSeries,
  type Ordering,
  type OrderingError,
  orderingNamed,
  type Progress,
  progress,
  type Series,
} from './ordering';
export {
  createRating,
  displayRating,
  type NormalizeError,
  normalizeRating,
  type Rating,
  type RatingError,
  type SourceScore,
} from './rating';
export type { Result } from './result';
export type { WorkId } from './work';

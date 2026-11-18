// Kysely + pg. The only package that touches Postgres. Migrations live in src/migrations.

export { type AuthSettings, createAuth } from './auth';
export { connect } from './connect';
export { DEMO, demoPassword, seedDemo } from './demo';
export {
  changeStatus,
  type Highlight,
  highlight,
  highlightsOf,
  historyOf,
  isReadOnly,
  type LibraryItem,
  type LibraryWork,
  libraryOf,
  logEntry,
  rate,
  reachSeason,
  type SourceRef,
  unhighlight,
  workOf,
} from './library';
export { migrateToLatest } from './migrate';
export { withUser } from './rls';
export { saveWork } from './work-cache';

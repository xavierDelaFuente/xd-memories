// Kysely + pg. The only package that touches Postgres. Migrations live in src/migrations.

export { type AuthSettings, createAuth } from './auth';
export { connect } from './connect';
export {
  changeStatus,
  type Highlight,
  highlight,
  highlightsOf,
  historyOf,
  type LibraryItem,
  libraryOf,
  logEntry,
  rate,
  unhighlight,
} from './library';
export { migrateToLatest } from './migrate';
export { withUser } from './rls';
export { saveWork } from './work-cache';

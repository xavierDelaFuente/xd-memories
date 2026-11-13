import { configDefaults, defineConfig } from 'vitest/config';

// e2e/ belongs to Playwright; both runners match *.spec.ts by default.
// tsconfig keeps JSX for Next to compile; Vitest compiles it itself, with React's automatic runtime.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: { name: 'web', exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'] },
});

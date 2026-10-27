import { configDefaults, defineConfig } from 'vitest/config';

// e2e/ belongs to Playwright; both runners match *.spec.ts by default.
export default defineConfig({
  test: { name: 'web', exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'] },
});

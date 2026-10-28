import type { NextConfig } from 'next';

// Local runs share the repo-root .env; on Vercel the variables come from project settings.
try {
  process.loadEnvFile('../../.env');
} catch {}

const config: NextConfig = {
  transpilePackages: ['@xd-memories/domain', '@xd-memories/contracts', '@xd-memories/sources'],
  typescript: { tsconfigPath: './tsconfig.build.json' },
};

export default config;

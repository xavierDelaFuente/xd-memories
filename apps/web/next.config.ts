import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@xd-memories/domain', '@xd-memories/contracts'],
  typescript: { tsconfigPath: './tsconfig.build.json' },
};

export default config;

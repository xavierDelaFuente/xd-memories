import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@xd-memories/domain', '@xd-memories/contracts'],
};

export default config;

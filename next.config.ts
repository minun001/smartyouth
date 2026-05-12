import type { NextConfig } from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: isGithubPages ? 'export' : undefined,
  basePath: isGithubPages ? '/smartyouth' : undefined,
  assetPrefix: isGithubPages ? '/smartyouth/' : undefined,
  trailingSlash: isGithubPages,
  images: {
    unoptimized: true
  }
};

export default nextConfig;

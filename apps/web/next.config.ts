import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Type-safe routing: <Link href> and router.push() are checked against
  // the real route tree. See docs/conventions/frontend-routing.md.
  experimental: {
    typedRoutes: true,
  },
  // Consume workspace packages as TypeScript source (no prebuild step).
  transpilePackages: ['@agent-git/contracts'],
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source (no build step), so Next must
  // transpile them. @spendlio/ui also ships its CSS through this package.
  transpilePackages: ['@spendlio/ui', '@spendlio/contracts'],
};

export default nextConfig;

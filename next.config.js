/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true
};

module.exports = nextConfig; 
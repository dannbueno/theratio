/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // No es necesario el rewrite para la página principal en App Router
};

module.exports = nextConfig; 
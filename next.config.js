/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['react-leaflet', 'leaflet'],
  experimental: {
    esmExternals: 'loose'
  }
};

module.exports = nextConfig; 
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-leaflet', 'leaflet'],
  webpack(config) {
    config.resolve.alias['@'] = path.join(__dirname, '');
    return config;
  },
  // Ignorar errores de ESLint durante la compilación
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignorar errores de TypeScript durante la compilación
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig; 
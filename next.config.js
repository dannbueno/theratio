/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-leaflet', 'leaflet'],
  webpack(config) {
    config.resolve.alias['@'] = path.join(__dirname, '');
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['pg-native'],
  },
  serverRuntimeConfig: {
    port: 3000
  },
};

module.exports = nextConfig; 
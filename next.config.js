/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-leaflet', 'leaflet'],
  webpack(config) {
    config.resolve.alias['@'] = path.join(__dirname, '');
    return config;
  }
};

module.exports = nextConfig; 
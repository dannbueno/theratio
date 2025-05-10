/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // Asegúrate de que las rutas de la API funcionen correctamente
  rewrites: async () => {
    return [
      {
        source: '/',
        destination: '/app/page.js',
      },
    ];
  },
};

module.exports = nextConfig; 
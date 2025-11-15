/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/upload',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig

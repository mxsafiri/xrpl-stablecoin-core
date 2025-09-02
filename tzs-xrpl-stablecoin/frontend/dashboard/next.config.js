/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_XRPL_NETWORK: process.env.NEXT_PUBLIC_XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233',
    NEXT_PUBLIC_DATABASE_URL: process.env.NEXT_PUBLIC_DATABASE_URL,
  },
}

module.exports = nextConfig

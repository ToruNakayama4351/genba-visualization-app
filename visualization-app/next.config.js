/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: '/genvanote-sql-for-customer',
  assetPrefix: '/genvanote-sql-for-customer/'
}

module.exports = nextConfig

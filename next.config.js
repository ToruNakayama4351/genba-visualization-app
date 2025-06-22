/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: '/genba-visualization-app',
  assetPrefix: '/genba-visualization-app/'
}

module.exports = nextConfig

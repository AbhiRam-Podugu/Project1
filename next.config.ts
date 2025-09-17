/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  outputFileTracingRoot: __dirname
};

module.exports = nextConfig;

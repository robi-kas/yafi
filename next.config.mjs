/** @type {import('next').NextConfig} */
const nextConfig = {
  // trailingSlash must stay off: it 308-redirects /api/db to /api/db/,
  // and the packaged app then parses the HTML 404 page as JSON.
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '16mb',
    },
  },
}

export default nextConfig

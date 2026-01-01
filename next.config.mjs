/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  // Disable server-side features that don't work in Electron
  experimental: {
    // Ensure client-side navigation works properly
  },
}

export default nextConfig

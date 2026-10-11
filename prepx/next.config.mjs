/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // A 4 MB import plus its multipart envelope stays below Vercel's 4.5 MB
    // Function request limit. The action enforces the authoritative file cap.
    serverActions: { bodySizeLimit: '4.2mb' },
  },
};

export default nextConfig;

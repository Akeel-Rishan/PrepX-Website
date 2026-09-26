/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Multipart requests add a small envelope around the 5 MB import file.
    // The action still enforces the authoritative 5 MB file-size limit.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;

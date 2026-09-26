/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Multipart requests add a small envelope around the 10 MB import file.
    // The action still enforces the authoritative 10 MB file-size limit.
    serverActions: { bodySizeLimit: '11mb' },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // We removed the 'eslint' block because it moved in the new version of Next.js
};

export default nextConfig;
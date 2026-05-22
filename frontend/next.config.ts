import type { NextConfig } from "next";

// In Docker: BACKEND_URL=http://backend:3003
// In local dev: falls back to http://localhost:3003
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3003";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

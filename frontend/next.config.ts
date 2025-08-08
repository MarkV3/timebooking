import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  },
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    // This keeps DX strict locally while unblocking CI builds for MVP.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

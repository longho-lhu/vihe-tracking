import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mqtt', 'bcryptjs', 'firebase-admin'],
  allowedDevOrigins: ['192.168.1.128'],
  devIndicators: {
    position: 'top-right',
  },
};

export default nextConfig;

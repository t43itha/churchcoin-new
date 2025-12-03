import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "@/convex": "./convex",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui.aceternity.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@/convex": path.resolve(__dirname, "convex"),
    };

    return config;
  },
};

export default nextConfig;

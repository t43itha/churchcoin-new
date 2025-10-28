import path from "path";
import type { NextConfig } from "next";

const clerkServerModulePath = "@clerk/nextjs/dist/esm/server/index.js";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "@/convex": "./convex",
      "@clerk/nextjs/server": clerkServerModulePath,
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
      "@clerk/nextjs/server": clerkServerModulePath,
    };

    return config;
  },
};

export default nextConfig;

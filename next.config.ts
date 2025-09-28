import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@/convex": "./convex",
    },
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

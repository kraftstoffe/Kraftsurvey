import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    workerThreads: false,
  },
};

export default nextConfig;

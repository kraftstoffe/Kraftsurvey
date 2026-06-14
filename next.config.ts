import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    workerThreads: false,
  },
};

export default nextConfig;

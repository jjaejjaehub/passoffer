import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    // bun workspace deduplicate zod to root — resolve it explicitly so webpack
    // always finds the same copy regardless of which node_modules it scans
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: path.resolve(__dirname, "../../node_modules/zod"),
    };
    return config;
  },
  reactCompiler: true,
  // 대형 패키지 named import 최적화 — 번들에서 실제 사용하는 심볼만 포함
  experimental: {
    optimizePackageImports: [
      "@chakra-ui/react",
      "lucide-react",
      "framer-motion",
      "date-fns",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gd.image-qoo10.jp",
      },
      {
        protocol: "https",
        hostname: "www.sportsdestinations.com",
      },
    ],
  },
};

export default nextConfig;

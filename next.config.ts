import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "bing.biturl.top" },
    ],
  },
  experimental: {
    // 图标与动效库按用到的成员拆包，避免整库进入首屏 chunk
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
  },
};

export default nextConfig;

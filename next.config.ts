import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "heic-convert", "heic-decode", "libheif-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, must-revalidate",
        },
      ],
    },
  ],
};

export default nextConfig;

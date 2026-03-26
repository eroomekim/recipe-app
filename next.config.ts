import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: "export" } : {}),
  serverExternalPackages: ["sharp"],
  images: {
    ...(isCapacitorBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

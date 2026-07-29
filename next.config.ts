import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // A multi-hour bike trainer ride recorded at 1Hz can be a few MB of
    // JSON by the time it's saved — comfortably above the 1MB default.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;

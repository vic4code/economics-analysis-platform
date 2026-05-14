import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Disable telemetry in CI / Vercel builds
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },
};

export default nextConfig;

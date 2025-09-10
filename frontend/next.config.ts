import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    SCAN_AGENT_URL:
      process.env.NODE_ENV === "production"
        ? "https://fortify-1b9n.onrender.com"
        : process.env.SCAN_AGENT_URL || "http://localhost:8000",
  },
};

export default nextConfig;

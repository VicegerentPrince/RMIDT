import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-leaflet", "leaflet"],
  env: {
    FASTAPI_INTERNAL_URL: process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;

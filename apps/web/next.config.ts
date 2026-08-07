import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ims/shared-types", "@ims/validation", "@ims/ui"],
  devIndicators: false,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs is a Node-only library; keep it out of the client/server bundles.
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // logo + roster uploads
  },
};

export default nextConfig;

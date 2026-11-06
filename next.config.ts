import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages serves the project under /<repo>; the Pages workflow sets this
  basePath: process.env.PAGES_BASE_PATH ?? "",
  allowedDevOrigins: lanIps,
};

export default nextConfig;

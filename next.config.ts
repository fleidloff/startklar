import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanIps,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;

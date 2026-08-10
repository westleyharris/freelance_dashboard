import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // There's a stray package-lock.json in the home directory. Without this,
    // Turbopack walks up and picks that as the workspace root, then warns that
    // it's outside the repo.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/dist/ssr",
    ],
  },
  logging: {
    incomingRequests: {
      ignore: [
        /^\/api\/auth\//,
        /^\/api\/invitations\//,
        /^\/invite\//,
        /^\/reset-password/,
      ],
    },
  },
};

export default config;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  poweredByHeader: false,
  experimental: {
    // Dev memory: compile dynamic imports only when first used, and let Turbopack drop work nobody needs.
    turbopackLazyDynamicImports: true,
    turbopackLazyDynamicImportsSSR: true,
    turbopackGc: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Everything except /embed/* may only be framed by this site itself.
        // /embed/* gets a per-partner frame-ancestors policy from src/proxy.ts.
        source: "/((?!embed/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

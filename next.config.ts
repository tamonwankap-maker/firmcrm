import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy. Next.js injects small inline scripts, so 'unsafe-inline' is needed for
 * scripts without a nonce setup; everything else is locked to this origin. Dev needs 'unsafe-eval'.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Only meaningful over HTTPS (set by the reverse proxy); browsers ignore it on plain HTTP.
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Self-hosted Docker image: bundle only what the server needs.
  output: "standalone",
  // The Playwright e2e server uses its own build folder so it never clashes with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Every page in this CRM is per-user and dynamic, so Cache Components is not used.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "exceljs", "@react-pdf/renderer"],
  experimental: {
    // Excel/CSV imports are uploaded through a server action (limit enforced again in code: 5 MB).
    serverActions: { bodySizeLimit: "6mb" },
    // A stale dev cache after restarts caused an endless page-reload loop (seen three times);
    // slower dev restarts are a better trade-off than a broken dev server.
    turbopackFileSystemCacheForDev: false,
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://res.cloudinary.com",
              "font-src 'self' data: https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
              "connect-src 'self' https://cdn.jsdelivr.net https://*.upstash.io https://api.cloudinary.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              "media-src 'self' blob: https://res.cloudinary.com",
              "worker-src 'self' blob: https://cdn.jsdelivr.net",
              ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, { silent: true, widenClientFileUpload: false });

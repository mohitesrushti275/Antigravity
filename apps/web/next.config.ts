import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Allow external images from R2/S3 CDN
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.gravatar.com" },
    ],
  },

  // Transpile workspace packages
  transpilePackages: ["@21st/types", "@21st/ui"],

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://cdn.tailwindcss.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co https://api.clerk.com https://*.clerk.accounts.dev https://api.anthropic.com https://api.openai.com",
              "frame-src 'self' blob: https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },

  typescript: { ignoreBuildErrors: false },
};

// Only enable Sentry if auth token is configured
const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      // Suppress Sentry source map upload logs
      silent: true,

      // Upload source maps for better stack traces in production
      org: process.env.SENTRY_ORG ?? "",
      project: process.env.SENTRY_PROJECT ?? "",

      // Source map configuration
      widenClientFileUpload: true,
      
      // Automatically tree-shake Sentry logger statements in production
      disableLogger: true,

      // Tunnel Sentry events through the app to avoid ad-blockers
      tunnelRoute: "/monitoring",

      // Automatically instrument API routes
      autoInstrumentServerFunctions: true,
      autoInstrumentMiddleware: true,
    })
  : nextConfig;

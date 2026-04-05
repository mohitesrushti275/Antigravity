import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Server-specific: capture unhandled promise rejections
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ["error"] }),
  ],

  beforeSend(event) {
    // Scrub auth headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }
    return event;
  },
});

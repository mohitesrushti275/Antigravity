import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { errors } from './response';

// ═══════════════════════════════════════════════════
// API ROUTE ERROR BOUNDARY WRAPPER
// Catches unhandled exceptions, reports to Sentry,
// logs structured JSON, returns standard error envelope.
// ═══════════════════════════════════════════════════

type RouteContext<T = Record<string, string>> = { params: Promise<T> };

/**
 * Wraps an API route handler with centralized error handling.
 *
 * Usage:
 *   export const GET = withHandler(async (req, ctx) => { ... });
 */
export function withHandler<T = Record<string, string>>(
  handler: (req: NextRequest, ctx: RouteContext<T>) => Promise<Response>
) {
  return async (req: NextRequest, ctx: RouteContext<T>): Promise<Response> => {
    const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;

      // ─── Structured JSON log ───────────────────
      console.error(JSON.stringify({
        level: 'error',
        traceId,
        method: req.method,
        path: req.nextUrl.pathname,
        error: message,
        stack,
        timestamp: new Date().toISOString(),
      }));

      // ─── Sentry capture ────────────────────────
      Sentry.captureException(err, {
        tags: {
          traceId,
          route: req.nextUrl.pathname,
          method: req.method,
        },
        extra: { stack },
      });

      return errors.internal(traceId);
    }
  };
}

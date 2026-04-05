import { NextRequest, NextResponse } from 'next/server';
import type { ApiError, ErrorCode } from '@21st/types';

// ═══════════════════════════════════════════════════
// STANDARD RESPONSE HELPERS
// ═══════════════════════════════════════════════════

/**
 * Standard success response with consistent { data, meta? } envelope.
 */
export function success<T>(data: T, meta?: { page: number; limit: number; total: number; has_more: boolean }) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

/**
 * Standard error response with consistent { error, code, details?, traceId? } envelope.
 */
export function error(
  message: string,
  code: ErrorCode,
  status: number,
  details?: unknown,
  traceId?: string
) {
  const body: ApiError = { error: message, code };
  if (details) body.details = details;
  if (traceId) body.traceId = traceId;
  return NextResponse.json(body, { status });
}

// ═══════════════════════════════════════════════════
// COMMON ERROR SHORTCUTS
// ═══════════════════════════════════════════════════

export const errors = {
  unauthorized: (msg = 'Unauthorized') =>
    error(msg, 'UNAUTHORIZED', 401),

  forbidden: (msg = 'Forbidden') =>
    error(msg, 'FORBIDDEN', 403),

  notFound: (msg = 'Resource not found') =>
    error(msg, 'NOT_FOUND', 404),

  conflict: (msg = 'Resource already exists') =>
    error(msg, 'CONFLICT', 409),

  validationError: (details: unknown) =>
    error('Validation failed', 'VALIDATION_ERROR', 400, details),

  rateLimited: (retryAfter: number) =>
    error('Too many requests', 'RATE_LIMITED', 429, { retryAfter }),

  payloadTooLarge: (msg = 'File exceeds size limit') =>
    error(msg, 'PAYLOAD_TOO_LARGE', 413),

  unsupportedMediaType: (msg = 'File type not allowed') =>
    error(msg, 'UNSUPPORTED_MEDIA_TYPE', 415),

  internal: (traceId?: string) =>
    error('Internal server error', 'INTERNAL_ERROR', 500, undefined, traceId),
};

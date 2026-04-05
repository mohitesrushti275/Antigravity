import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

// ═══════════════════════════════════════════════════
// CSRF PROTECTION
// Double-submit cookie pattern for state-changing mutations.
// - Server sets a random CSRF token in a cookie
// - Client sends it back in the `x-csrf-token` header
// - Server verifies they match
// ═══════════════════════════════════════════════════

const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a new CSRF token and return it with a Set-Cookie header value.
 */
export function generateCsrfToken(): { token: string; cookieHeader: string } {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieHeader = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    isProduction ? 'Secure' : '',
    `Max-Age=${60 * 60 * 4}`, // 4 hours
  ]
    .filter(Boolean)
    .join('; ');

  return { token, cookieHeader };
}

/**
 * Validate CSRF token from request.
 * Compares the cookie value against the `x-csrf-token` header.
 * Returns true if valid, false if mismatch or missing.
 *
 * Exemptions (no CSRF needed):
 * - API key-authenticated requests (programmatic clients)
 * - Requests with `Content-Type: application/json` from same-origin
 *   (browser same-origin policy prevents cross-origin JSON POST)
 */
export function validateCsrfToken(req: NextRequest): boolean {
  // API-key authenticated requests are exempt (non-browser clients)
  if (
    req.headers.get('authorization')?.startsWith('Bearer 21st_') ||
    req.headers.get('x-api-key')?.startsWith('21st_')
  ) {
    return true;
  }

  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison.
 * Prevents timing side-channel attacks on token validation.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * State-changing HTTP methods that require CSRF validation.
 */
export const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Check if a request method needs CSRF protection.
 */
export function needsCsrfProtection(method: string): boolean {
  return CSRF_PROTECTED_METHODS.has(method.toUpperCase());
}

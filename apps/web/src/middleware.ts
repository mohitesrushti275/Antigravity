import { clerkMiddleware, clerkClient, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { extractAdminRole, hasMinimumRole, AdminRole, isValidRole } from '@/lib/rbac';

// ═══════════════════════════════════════════════════
// MIDDLEWARE — Auth + Rate Limiting + Security Headers
// ═══════════════════════════════════════════════════

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/s/(.*)',
  '/api/components(.*)',
  '/api/categories(.*)',
  '/api/tags(.*)',
  '/api/search(.*)',
  '/api/r/(.*)',        // shadcn registry
  '/api/health',
  '/api/webhooks/(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
]);

const isMagicRoute = createRouteMatcher([
  '/api/magic/(.*)',
]);

const isCronRoute = createRouteMatcher([
  '/api/cron/(.*)',
]);

// Rate limiters (tiered)
let ratelimit: Record<string, Ratelimit> | null = null;

function getRateLimiters() {
  if (ratelimit) return ratelimit;

  try {
    const redis = Redis.fromEnv();
    ratelimit = {
      public: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'rl:public',
      }),
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, '1 m'),
        prefix: 'rl:auth',
      }),
      magic: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        prefix: 'rl:magic',
      }),
      admin: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(200, '1 m'),
        prefix: 'rl:admin',
      }),
    };
    return ratelimit;
  } catch (err) {
    // Redis not configured — skip rate limiting in dev
    console.warn(JSON.stringify({ level: 'warn', message: 'Redis not configured, rate limiting disabled', error: err instanceof Error ? err.message : 'unknown' }));
    return null;
  }
}

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const traceId = crypto.randomUUID();

  // Inject traceId into request headers for downstream use
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-trace-id', traceId);

  // ── Cron routes: verify cron secret ──
  if (isCronRoute(req)) {
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next({ headers: requestHeaders });
  }

  // ── Rate limiting ──
  const limiters = getRateLimiters();
  if (limiters) {
    const identifier = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'anonymous';
    let tier = 'public';

    if (isAdminRoute(req)) tier = 'admin';
    else if (isMagicRoute(req)) tier = 'magic';
    else {
      const { userId } = await auth();
      if (userId) tier = 'auth';
    }

    const limiter = limiters[tier];
    if (limiter) {
      const { success, reset } = await limiter.limit(identifier);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests', code: 'RATE_LIMITED', retryAfter: Math.ceil((reset - Date.now()) / 1000) },
          { status: 429 }
        );
      }
    }
  }

  // ── Admin route protection ──
  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try fast path: extract role from session claims (works if custom session token is configured)
    const claims = sessionClaims as Record<string, unknown>;
    let role = extractAdminRole(claims);

    // Fallback: fetch user from Clerk API to read publicMetadata.role
    // This handles the default case where publicMetadata isn't in the JWT
    if (!role) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const metaRole = user.publicMetadata?.role;
        if (metaRole && isValidRole(metaRole)) {
          role = metaRole;
        } else if (metaRole === 'admin') {
          role = AdminRole.ADMIN;
        }
      } catch (err) {
        console.warn('Failed to fetch user from Clerk for admin check:', err);
      }
    }

    if (!role || !hasMinimumRole(role, AdminRole.VIEWER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Attach role to request headers for downstream route handlers
    requestHeaders.set('x-admin-role', role);
  }

  // ── Protected routes ──
  if (!isPublicRoute(req) && !isMagicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // API routes → JSON 401; browser pages → redirect to sign-in
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // ── CSRF protection for mutations ──
  const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (
    req.nextUrl.pathname.startsWith('/api/') &&
    CSRF_PROTECTED_METHODS.has(req.method) &&
    !req.nextUrl.pathname.startsWith('/api/webhooks/') &&
    !req.nextUrl.pathname.startsWith('/api/cron/') &&
    !req.nextUrl.pathname.startsWith('/api/csrf')
  ) {
    // Exempt API-key authenticated requests (programmatic clients)
    const hasApiKey =
      req.headers.get('authorization')?.startsWith('Bearer 21st_') ||
      req.headers.get('x-api-key')?.startsWith('21st_');

    if (!hasApiKey) {
      const csrfCookie = req.cookies.get('__csrf')?.value;
      const csrfHeader = req.headers.get('x-csrf-token');

      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return NextResponse.json(
          { error: 'CSRF token invalid or missing', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
  }

  // Apply security headers to the response
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('x-trace-id', traceId);

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

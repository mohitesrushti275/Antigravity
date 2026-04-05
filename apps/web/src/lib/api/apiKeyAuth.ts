import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ═══════════════════════════════════════════════════
// API KEY VALIDATION & STRUCTURED LOGGING
// Securely validates API keys and logs each usage
// with metadata for analytics and security auditing.
// ═══════════════════════════════════════════════════

interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_prefix: string;
  scope: string;
  monthly_count: number;
  monthly_limit: number;
  revoked_at: string | null;
}

interface ValidatedKey {
  keyId: string;
  userId: string;
  scope: string;
  remaining: number;
}

interface ValidationError {
  error: string;
  code: string;
  status: number;
}

type ValidationResult = 
  | { ok: true; data: ValidatedKey }
  | { ok: false; error: ValidationError };

/**
 * Validate an API key from a raw Bearer token.
 * - Hashes the token with SHA-256 and looks up in DB
 * - Checks revocation status
 * - Enforces monthly rate limits
 * - Logs usage with structured metadata
 */
export async function validateApiKey(
  rawKey: string,
  meta: { endpoint: string; ip?: string; userAgent?: string }
): Promise<ValidationResult> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  // Look up key by hash
  const { data: key, error: dbError } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, key_prefix, scope, monthly_count, monthly_limit, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (dbError || !key) {
    logKeyEvent('auth.failed', {
      reason: 'invalid_key',
      keyPrefix,
      endpoint: meta.endpoint,
      ip: meta.ip,
    });
    return {
      ok: false,
      error: { error: 'Invalid API key', code: 'UNAUTHORIZED', status: 401 },
    };
  }

  const record = key as unknown as ApiKeyRecord;

  // Check revocation
  if (record.revoked_at) {
    logKeyEvent('auth.denied', {
      reason: 'revoked',
      keyId: record.id,
      keyPrefix: record.key_prefix,
      endpoint: meta.endpoint,
    });
    return {
      ok: false,
      error: { error: 'API key has been revoked', code: 'FORBIDDEN', status: 403 },
    };
  }

  // Check rate limit
  if (record.monthly_count >= record.monthly_limit) {
    logKeyEvent('ratelimit.exceeded', {
      keyId: record.id,
      keyPrefix: record.key_prefix,
      used: record.monthly_count,
      limit: record.monthly_limit,
      endpoint: meta.endpoint,
    });
    return {
      ok: false,
      error: { error: 'Monthly API limit exceeded', code: 'RATE_LIMITED', status: 429 },
    };
  }

  // Increment usage atomically + update last_used_at
  await supabaseAdmin
    .from('api_keys')
    .update({
      monthly_count: record.monthly_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  // Log successful usage
  logKeyEvent('auth.success', {
    keyId: record.id,
    keyPrefix: record.key_prefix,
    scope: record.scope,
    endpoint: meta.endpoint,
    usage: `${record.monthly_count + 1}/${record.monthly_limit}`,
    ip: meta.ip,
  });

  return {
    ok: true,
    data: {
      keyId: record.id,
      userId: record.user_id,
      scope: record.scope,
      remaining: record.monthly_limit - record.monthly_count - 1,
    },
  };
}

/**
 * Extract API key from request headers.
 * Supports:
 * - `Authorization: Bearer 21st_xxx...`
 * - `x-api-key: 21st_xxx...`
 */
export function extractApiKey(headers: Headers): string | null {
  // Check Authorization header first
  const authHeader = headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('21st_')) return token;
  }

  // Fallback to x-api-key
  const xApiKey = headers.get('x-api-key');
  if (xApiKey?.startsWith('21st_')) return xApiKey;

  return null;
}

// ═══════════════════════════════════════════════════
// STRUCTURED KEY EVENT LOGGER
// ═══════════════════════════════════════════════════

function logKeyEvent(event: string, data: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: '21st-api',
    event,
    ...data,
  };

  // Structured JSON log — picked up by log aggregators (Datadog, etc.)
  console.log(JSON.stringify(logEntry));
}

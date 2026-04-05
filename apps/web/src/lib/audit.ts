import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AuditAction, AuditResourceType } from '@21st/types';

// ═══════════════════════════════════════════════════
// AUDIT LOG WRITER
// ═══════════════════════════════════════════════════

interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  traceId?: string | null;
}

/**
 * Write a structured entry to the audit log.
 * Uses the service-role client (bypasses RLS).
 * Fire-and-forget — does not throw on failure.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    // Sanitize metadata: truncate large values to prevent abuse
    const sanitizedMetadata = sanitizeMetadata(params.metadata ?? {});

    await supabaseAdmin.from('audit_log').insert({
      user_id: params.userId ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      metadata: sanitizedMetadata,
      ip_hash: params.ipHash ?? null,
      trace_id: params.traceId ?? null,
    });
  } catch (err) {
    // Log but don't throw — audit log failures should not break requests
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to write audit log',
      action: params.action,
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
  }
}

/**
 * Sanitize metadata to prevent abuse (large payloads, injection).
 * Truncates string values to 500 chars, limits metadata to 10 keys.
 */
function sanitizeMetadata(
  meta: Record<string, unknown>
): Record<string, unknown> {
  const MAX_KEYS = 10;
  const MAX_STRING_LENGTH = 500;

  const keys = Object.keys(meta).slice(0, MAX_KEYS);
  const sanitized: Record<string, unknown> = {};

  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'string') {
      sanitized[key] = value.slice(0, MAX_STRING_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = null;
    } else {
      // For nested objects/arrays, stringify and truncate
      try {
        sanitized[key] = JSON.parse(JSON.stringify(value, null, 0).slice(0, MAX_STRING_LENGTH));
      } catch {
        sanitized[key] = '[unserializable]';
      }
    }
  }

  return sanitized;
}

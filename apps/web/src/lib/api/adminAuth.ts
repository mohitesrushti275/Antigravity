import { NextRequest } from 'next/server';
import { AdminRoleType, PermissionType, extractAdminRole, hasPermission, isValidRole } from '@/lib/rbac';
import { errors } from '@/lib/api/response';
import { auth } from '@clerk/nextjs/server';

// ═══════════════════════════════════════════════════
// ADMIN AUTH HELPER
// Extracts admin role from middleware-injected header
// and enforces permission checks per route.
// ═══════════════════════════════════════════════════

interface AdminAuthResult {
  userId: string;
  role: AdminRoleType;
}

/**
 * Verify the caller is an admin with the given permission.
 * Uses the `x-admin-role` header set by middleware for efficiency,
 * falling back to a live Clerk auth check if the header is absent.
 *
 * Returns the userId and role, or a Response error.
 */
export async function requirePermission(
  req: NextRequest,
  permission: PermissionType
): Promise<AdminAuthResult | Response> {
  // Try fast-path: role already verified by middleware
  const roleHeader = req.headers.get('x-admin-role');
  let role: AdminRoleType | null = null;

  if (roleHeader && isValidRole(roleHeader)) {
    role = roleHeader;
  } else {
    // Fallback: extract from Clerk session directly
    const { sessionClaims } = await auth();
    if (sessionClaims) {
      role = extractAdminRole(sessionClaims as Record<string, unknown>);
    }
  }

  if (!role) {
    return errors.forbidden('Admin role required');
  }

  if (!hasPermission(role, permission)) {
    return errors.forbidden(`Insufficient permissions: requires ${permission}`);
  }

  const { userId } = await auth();
  if (!userId) {
    return errors.unauthorized();
  }

  return { userId, role };
}

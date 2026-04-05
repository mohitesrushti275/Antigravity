import { auth, clerkClient } from '@clerk/nextjs/server';
import { AdminRole, AdminRoleType, isValidRole } from '@/lib/rbac';

// ═══════════════════════════════════════════════════
// CLERK ADMIN HELPER
// Checks admin status from Clerk publicMetadata
// (not Supabase DB) to avoid dependency on DB sync.
// ═══════════════════════════════════════════════════

/**
 * Check if the current user is an admin by reading Clerk publicMetadata.
 * Returns the admin role if found, null otherwise.
 * 
 * This is the source of truth for admin status — Supabase DB is secondary.
 */
export async function getAdminRole(): Promise<AdminRoleType | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metaRole = user.publicMetadata?.role;

    if (metaRole && isValidRole(metaRole)) {
      return metaRole;
    }
    
    // Backward compatibility: treat old 'admin' string as AdminRole.ADMIN
    if (metaRole === 'admin') {
      return AdminRole.ADMIN;
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch user from Clerk:', err);
    return null;
  }
}

/**
 * Check if the current user has at least the specified admin role.
 * Returns true if user is admin with sufficient privileges.
 */
export async function isAdmin(minRole: AdminRoleType = AdminRole.VIEWER): Promise<boolean> {
  const role = await getAdminRole();
  if (!role) return false;

  const roleHierarchy = [AdminRole.VIEWER, AdminRole.MODERATOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN];
  const userLevel = roleHierarchy.indexOf(role);
  const requiredLevel = roleHierarchy.indexOf(minRole);

  return userLevel >= requiredLevel;
}

/**
 * Legacy helper: check if user has the old "admin" role.
 * Use isAdmin() for new code with granular roles.
 */
export async function isLegacyAdmin(): Promise<boolean> {
  return isAdmin(AdminRole.ADMIN);
}

// ═══════════════════════════════════════════════════
// ROLE-BASED ACCESS CONTROL (RBAC)
// Granular admin permission system with viewer, moderator,
// and super-admin tiers.
// ═══════════════════════════════════════════════════

/**
 * Admin roles ordered by privilege level (ascending).
 * Each higher role inherits all permissions from lower roles.
 */
export const AdminRole = {
  VIEWER: 'viewer',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type AdminRoleType = (typeof AdminRole)[keyof typeof AdminRole];

/**
 * Privilege hierarchy — higher index = more permissions.
 */
const ROLE_HIERARCHY: AdminRoleType[] = [
  AdminRole.VIEWER,
  AdminRole.MODERATOR,
  AdminRole.ADMIN,
  AdminRole.SUPER_ADMIN,
];

/**
 * Permission constants for each feature area.
 */
export const Permission = {
  // Analytics & Read-only
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_USERS: 'view_users',
  VIEW_AUDIT_LOG: 'view_audit_log',

  // Content moderation
  REVIEW_COMPONENTS: 'review_components',
  APPROVE_COMPONENTS: 'approve_components',
  REJECT_COMPONENTS: 'reject_components',
  FEATURE_COMPONENTS: 'feature_components',

  // User management
  EDIT_USERS: 'edit_users',
  SUSPEND_USERS: 'suspend_users',
  DELETE_USERS: 'delete_users',

  // System administration
  MANAGE_API_KEYS: 'manage_api_keys',
  MANAGE_CATEGORIES: 'manage_categories',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_ROLES: 'manage_roles',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

/**
 * Role → permissions mapping.
 * Each role explicitly lists what it can do.
 */
const ROLE_PERMISSIONS: Record<AdminRoleType, PermissionType[]> = {
  [AdminRole.VIEWER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_USERS,
    Permission.VIEW_AUDIT_LOG,
  ],

  [AdminRole.MODERATOR]: [
    // Inherits viewer permissions (resolved at runtime)
    Permission.REVIEW_COMPONENTS,
    Permission.APPROVE_COMPONENTS,
    Permission.REJECT_COMPONENTS,
    Permission.FEATURE_COMPONENTS,
  ],

  [AdminRole.ADMIN]: [
    // Inherits moderator permissions
    Permission.EDIT_USERS,
    Permission.SUSPEND_USERS,
    Permission.MANAGE_API_KEYS,
    Permission.MANAGE_CATEGORIES,
    Permission.MANAGE_SETTINGS,
  ],

  [AdminRole.SUPER_ADMIN]: [
    // Inherits admin permissions
    Permission.DELETE_USERS,
    Permission.MANAGE_ROLES,
  ],
};

/**
 * Get the numeric privilege level for a role.
 */
function getRoleLevel(role: AdminRoleType): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Get all effective permissions for a role (including inherited).
 */
export function getEffectivePermissions(role: AdminRoleType): Set<PermissionType> {
  const level = getRoleLevel(role);
  const permissions = new Set<PermissionType>();

  for (let i = 0; i <= level; i++) {
    const r = ROLE_HIERARCHY[i];
    if (r && ROLE_PERMISSIONS[r]) {
      for (const p of ROLE_PERMISSIONS[r]) {
        permissions.add(p);
      }
    }
  }

  return permissions;
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: AdminRoleType, permission: PermissionType): boolean {
  return getEffectivePermissions(role).has(permission);
}

/**
 * Check if role meets minimum required role level.
 * e.g., `hasMinimumRole('moderator', 'viewer')` → true
 */
export function hasMinimumRole(userRole: AdminRoleType, requiredRole: AdminRoleType): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Validate that a string is a valid admin role.
 */
export function isValidRole(role: unknown): role is AdminRoleType {
  return typeof role === 'string' && ROLE_HIERARCHY.includes(role as AdminRoleType);
}

/**
 * Extract the admin role from Clerk session claims.
 * Returns null if no admin role is found.
 */
export function extractAdminRole(sessionClaims: Record<string, unknown>): AdminRoleType | null {
  const role =
    sessionClaims?.role ??
    (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role ??
    (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.role;

  if (isValidRole(role)) return role;

  // Backward compatibility: treat old 'admin' string as AdminRole.ADMIN
  if (role === 'admin') return AdminRole.ADMIN;

  return null;
}

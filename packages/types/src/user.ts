// ═══════════════════════════════════════════════════
// SHARED USER TYPES
// packages/types/src/user.ts
// ═══════════════════════════════════════════════════

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  clerk_id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  github_url?: string;
  twitter_url?: string;
  website_url?: string;
  features?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  github_url?: string;
  twitter_url?: string;
  website_url?: string;
  created_at: string;
  stats: {
    componentCount: number;
    totalDownloads: number;
  };
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  scope: "magic" | "registry" | "admin";
  monthly_count: number;
  monthly_limit: number;
  month_reset_at: string;
  last_used_at?: string;
  revoked_at?: string;
  created_at: string;
}

// Audit log types
export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "component.create"
  | "component.update"
  | "component.delete"
  | "component.reviewed"
  | "component.liked"
  | "component.unliked"
  | "apikey.create"
  | "apikey.revoke"
  | "magic.generate";

export type AuditResourceType = "user" | "component" | "apikey" | "magic";

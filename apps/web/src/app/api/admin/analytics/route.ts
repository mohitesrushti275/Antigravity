import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/api/adminAuth";
import { Permission } from "@/lib/rbac";

// GET /api/admin/analytics — Installs, signups, top components (30d)
export async function GET(req: NextRequest) {
  const authResult = await requirePermission(req, Permission.VIEW_ANALYTICS);
  if (authResult instanceof Response) return authResult;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Total counts
  const [
    { count: totalComponents },
    { count: totalUsers },
    { count: pendingReview },
  ] = await Promise.all([
    supabaseAdmin.from("components").select("*", { count: "exact", head: true }).in("status", ["posted", "featured"]),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("components").select("*", { count: "exact", head: true }).eq("status", "on_review"),
  ]);

  // 30-day downloads
  const { count: recentDownloads } = await supabaseAdmin
    .from("downloads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);

  // 30-day signups
  const { count: recentSignups } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);

  // Top 10 components by downloads (30d)
  const { data: topComponents } = await supabaseAdmin
    .from("components")
    .select("id, name, slug, download_count, like_count, users(username)")
    .in("status", ["posted", "featured"])
    .order("download_count", { ascending: false })
    .limit(10);

  // Recent audit actions
  const { data: recentActions } = await supabaseAdmin
    .from("audit_log")
    .select("action, created_at, metadata")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  return Response.json({
    data: {
      overview: {
        totalComponents: totalComponents ?? 0,
        totalUsers: totalUsers ?? 0,
        pendingReview: pendingReview ?? 0,
        recentDownloads: recentDownloads ?? 0,
        recentSignups: recentSignups ?? 0,
      },
      topComponents: topComponents ?? [],
      recentActions: recentActions ?? [],
    },
  });
}

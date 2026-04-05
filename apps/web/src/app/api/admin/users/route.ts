import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/api/adminAuth";
import { Permission } from "@/lib/rbac";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/admin/users — Paginated user list with component counts
export async function GET(req: NextRequest) {
  const authResult = await requirePermission(req, Permission.VIEW_USERS);
  if (authResult instanceof Response) return authResult;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "";
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("users")
    .select("id, clerk_id, username, email, role, avatar_url, created_at, updated_at", { count: "exact" });

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (role) {
    query = query.eq("role", role);
  }

  const { data: users, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Get component counts for each user
  const usersWithCounts = await Promise.all(
    (users ?? []).map(async (u: Record<string, unknown>) => {
      const { count: componentCount } = await supabaseAdmin
        .from("components")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id);

      return { ...u, componentCount: componentCount ?? 0 };
    })
  );

  return Response.json({
    data: usersWithCounts,
    meta: { page, limit, total: count ?? 0, has_more: offset + limit < (count ?? 0) },
  });
}

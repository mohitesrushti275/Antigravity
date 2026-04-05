import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/admin/audit — Filtered audit log
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const userId = searchParams.get("user_id");
  const action = searchParams.get("action");
  const resourceType = searchParams.get("resource_type");
  const offset = (page - 1) * limit;


  let query = supabaseAdmin
    .from("audit_log")
    .select("id, user_id, action, resource_type, resource_id, metadata, ip_hash, trace_id, created_at", { count: "exact" });

  if (userId) query = query.eq("user_id", userId);
  if (action) query = query.eq("action", action);
  if (resourceType) query = query.eq("resource_type", resourceType);

  const { data: logs, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return Response.json({
    data: logs ?? [],
    meta: { page, limit, total: count ?? 0, has_more: offset + limit < (count ?? 0) },
  });
}

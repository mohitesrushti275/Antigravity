import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { isLegacyAdmin } from "@/lib/api/clerkAdmin";

// ═══════════════════════════════════════════════════
// ADMIN COMPONENTS API — /api/admin/components
// Full listing with all statuses, search, status filter
// ═══════════════════════════════════════════════════


async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Check admin status from Clerk (not DB)
  const userIsAdmin = await isLegacyAdmin();
  if (!userIsAdmin) throw new Error("Forbidden");

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) throw new Error("User not found in DB");
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "";
    const sort = searchParams.get("sort") ?? "newest";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

    let query = supabaseAdmin
      .from("components")
      .select("id, name, slug, description, status, category_id, download_count, like_count, published_at, created_at, users!inner(username)")
      .limit(limit);

    // Filter by status (admins see all statuses)
    if (status) {
      query = query.eq("status", status);
    }

    // Text search
    if (q) {
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Sort
    if (sort === "popular") {
      query = query.order("download_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { isLegacyAdmin } from "@/lib/api/clerkAdmin";

// ═══════════════════════════════════════════════════
// ADMIN ENTRIES API — /api/admin/entries
// CRUD for design showcase entries
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

// ─── GET: List entries (optionally filter by category) ──
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const categoryId = req.nextUrl.searchParams.get("categoryId");

    let query = supabaseAdmin
      .from("design_entries")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST: Create a new entry ──────────────────────
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { categoryId, title, imageUrl, imageKey, prompt, code } = body;

    if (!categoryId || !title?.trim()) {
      return NextResponse.json(
        { error: "categoryId and title are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("design_entries")
      .insert({
        category_id: categoryId,
        title: title.trim(),
        image_url: imageUrl ?? "",
        image_key: imageKey ?? null,
        prompt: prompt ?? "",
        code: code ?? "",
        is_published: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { isLegacyAdmin } from "@/lib/api/clerkAdmin";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════
// ADMIN ENTRY BY ID — /api/admin/entries/[id]
// GET, PATCH, DELETE for a single design entry
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

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET: Single entry ─────────────────────────────
export async function GET(_: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const { data, error } = await supabaseAdmin
      .from("design_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── PATCH: Update entry ───────────────────────────
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
    if (body.imageKey !== undefined) updateData.image_key = body.imageKey;
    if (body.prompt !== undefined) updateData.prompt = body.prompt;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.displayOrder !== undefined) updateData.display_order = body.displayOrder;
    if (body.isPublished !== undefined) updateData.is_published = body.isPublished;

    const { data, error } = await supabaseAdmin
      .from("design_entries")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

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

// ─── DELETE: Remove entry ──────────────────────────
export async function DELETE(_: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const { error } = await supabaseAdmin
      .from("design_entries")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

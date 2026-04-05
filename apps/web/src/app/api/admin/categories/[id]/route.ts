import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { cache } from "@/lib/cache";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const UpdateCategorySchema = z.object({
  slug: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  section: z.enum(["marketing", "ui", "screens", "themes"]).optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// PATCH /api/admin/categories/:id — Rename, reorder, toggle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Failed to update category", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  await cache.del("categories:all");
  return Response.json({ data: updated });
}

// DELETE /api/admin/categories/:id — Delete category (cascades to entries)
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Delete design entries first (or rely on CASCADE), then category
  await supabaseAdmin.from("design_entries").delete().eq("category_id", id);
  const { error } = await supabaseAdmin.from("categories").delete().eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to delete category", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  await cache.del("categories:all");
  return Response.json({ success: true });
}

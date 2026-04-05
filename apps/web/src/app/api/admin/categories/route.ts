import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { cache } from "@/lib/cache";

const CategorySchema = z.object({
  slug: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  section: z.enum(["marketing", "ui", "screens", "themes"]).optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// POST /api/admin/categories — Add new category
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CategorySchema.extend({
    slug: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    section: z.enum(["marketing", "ui", "screens", "themes"]),
  }).safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }


  const { data: category, error } = await supabaseAdmin
    .from("categories")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Category slug already exists", code: "CONFLICT" }, { status: 409 });
    }
    return Response.json({ error: "Failed to create category", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  await cache.del("categories:all");
  return Response.json({ data: category }, { status: 201 });
}

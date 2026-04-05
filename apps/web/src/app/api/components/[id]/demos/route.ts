import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

const CreateDemoSchema = z.object({
  name: z.string().min(1).max(100).default("default"),
  displayOrder: z.number().int().min(0).default(0),
});

// POST /api/components/:id/demos — Add demo variant
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateDemoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  // Get internal user ID
  const { data: user } = await supabaseAdmin
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Verify ownership
  const { data: component } = await supabaseAdmin
    .from("components")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!component) {
    return Response.json({ error: "Component not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (component.user_id !== user.id) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { data: demo, error } = await supabaseAdmin
    .from("component_demos")
    .insert({
      component_id: id,
      name: parsed.data.name,
      display_order: parsed.data.displayOrder,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Failed to create demo", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  return Response.json({ data: demo }, { status: 201 });
}

// GET /api/components/:id/demos — List demos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: demos } = await supabaseAdmin
    .from("component_demos")
    .select("*")
    .eq("component_id", id)
    .order("display_order");

  return Response.json({ data: demos ?? [] });
}

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

// DELETE /api/components/:id/demos/:demoId — Remove demo + R2 files
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; demoId: string }> }
) {
  const { id, demoId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
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

  if (!component || component.user_id !== user.id) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  // Delete associated files
  await supabaseAdmin
    .from("component_files")
    .delete()
    .eq("demo_id", demoId);

  // Delete demo
  const { error } = await supabaseAdmin
    .from("component_demos")
    .delete()
    .eq("id", demoId)
    .eq("component_id", id);

  if (error) {
    return Response.json({ error: "Failed to delete demo", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  return Response.json({ data: { deleted: true } });
}

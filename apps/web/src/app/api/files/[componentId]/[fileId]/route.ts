import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { isLegacyAdmin } from "@/lib/api/clerkAdmin";

// DELETE /api/files/:componentId/:fileId — Delete from S3 + DB
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ componentId: string; fileId: string }> }
) {
  const { componentId, fileId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: component } = await supabaseAdmin
    .from("components")
    .select("id, user_id")
    .eq("id", componentId)
    .single();

  if (!component) {
    return Response.json({ error: "Component not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  // Check if user is admin via Clerk (not DB)
  const userIsAdmin = await isLegacyAdmin();

  if (!user || (component.user_id !== user.id && !userIsAdmin)) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("component_files")
    .delete()
    .eq("id", fileId)
    .eq("component_id", componentId);

  if (error) {
    return Response.json({ error: "Failed to delete file", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  return Response.json({ data: { deleted: true } });
}

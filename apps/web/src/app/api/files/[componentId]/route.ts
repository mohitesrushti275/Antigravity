import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { isLegacyAdmin } from "@/lib/api/clerkAdmin";

// GET /api/files/:componentId — List file metadata
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  const { componentId } = await params;
  const { userId } = await auth();

  // Check ownership or admin
  const { data: component } = await supabaseAdmin
    .from("components")
    .select("id, user_id")
    .eq("id", componentId)
    .single();

  if (!component) {
    return Response.json({ error: "Component not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Get user record
  const { data: user } = userId
    ? await supabaseAdmin.from("users").select("id").eq("clerk_id", userId).single()
    : { data: null };

  // Check if user is admin via Clerk (not DB)
  const userIsAdmin = await isLegacyAdmin();

  if (!user || (component.user_id !== user.id && !userIsAdmin)) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { data: files } = await supabaseAdmin
    .from("component_files")
    .select("id, file_type, r2_key, filename, size_bytes, content_type, checksum, created_at")
    .eq("component_id", componentId)
    .order("file_type");

  return Response.json({ data: files ?? [] });
}

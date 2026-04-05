import { NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

// DELETE /api/keys/:id — Revoke key
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: "Failed to revoke key", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  await writeAuditLog({
    userId: user.id,
    action: "apikey.revoke",
    resourceType: "apikey",
    resourceId: id,
  });

  return Response.json({ data: { revoked: true } });
}

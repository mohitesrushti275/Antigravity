import { NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { isLegacyAdmin } from "@/lib/api/clerkAdmin";

const UpdateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  banned: z.boolean().optional(),
});

// PATCH /api/admin/users/:id — Set role, ban/unban
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify caller is admin via Clerk auth
  const { userId: adminClerkId } = await auth();
  if (!adminClerkId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  // Verify admin role from Clerk (not DB)
  const userIsAdmin = await isLegacyAdmin();
  if (!userIsAdmin) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  // Get admin user ID from DB for audit log
  const { data: adminUser } = await supabaseAdmin
    .from("users").select("id").eq("clerk_id", adminClerkId).single();
  if (!adminUser) {
    return Response.json({ error: "Admin user not found in DB", code: "NOT_FOUND" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.role) updateData.role = parsed.data.role;
  if (parsed.data.banned !== undefined) {
    updateData.features = { banned: parsed.data.banned };
  }

  const { data: updated, error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Failed to update user", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  await writeAuditLog({
    userId: adminUser.id,
    action: "user.update",
    resourceType: "user",
    resourceId: id,
    metadata: parsed.data,
  });

  return Response.json({ data: updated });
}

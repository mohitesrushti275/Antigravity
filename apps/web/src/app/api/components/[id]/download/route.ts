import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

// POST /api/components/:id/download — Log install + increment count
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const method = body.method ?? "copy";

  // Verify component exists
  const { data: component } = await supabaseAdmin
    .from("components")
    .select("id, download_count")
    .eq("id", id)
    .in("status", ["posted", "featured"])
    .single();

  if (!component) {
    return Response.json({ error: "Component not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Optional auth — downloads are semi-public but we log the user if available
  const { userId: clerkId } = await auth().catch(() => ({ userId: null }));
  let internalUserId: string | null = null;
  if (clerkId) {
    const { data: user } = await supabaseAdmin
      .from("users").select("id").eq("clerk_id", clerkId).single();
    internalUserId = user?.id ?? null;
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  await supabaseAdmin.from("downloads").insert({
    component_id: id,
    user_id: internalUserId,
    ip_hash: ipHash,
    install_method: method,
    user_agent: req.headers.get("user-agent") ?? null,
  });

  // Increment counter via RPC (with fallback to direct update)
  const { error: rpcError } = await supabaseAdmin.rpc("increment_download_count", { comp_id: id });
  if (rpcError) {
    // Fallback: direct increment
    await supabaseAdmin
      .from("components")
      .update({ download_count: (component.download_count ?? 0) + 1 })
      .eq("id", id);
  }

  return Response.json({ data: { recorded: true } });
}

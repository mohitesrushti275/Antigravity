import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100).default("default"),
  scope: z.enum(["magic", "registry", "admin"]).default("magic"),
});

// POST /api/keys — Create API key (returns plaintext once)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  // Get internal user ID
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Generate 32-byte random key
  const rawKey = `21st_${randomBytes(32).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const { data: apiKey, error } = await supabaseAdmin
    .from("api_keys")
    .insert({
      user_id: user.id,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      name: parsed.data.name,
      scope: parsed.data.scope,
    })
    .select("id, name, key_prefix, scope, monthly_limit, created_at")
    .single();

  if (error) {
    return Response.json({ error: "Failed to create key", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  await writeAuditLog({
    userId: user.id,
    action: "apikey.create",
    resourceType: "apikey",
    resourceId: apiKey.id,
    metadata: { name: parsed.data.name, scope: parsed.data.scope },
  });

  // Return plaintext key ONCE — never stored
  return Response.json({
    data: {
      ...apiKey,
      key: rawKey, // Only time the full key is returned
    },
  }, { status: 201 });
}

// GET /api/keys — List caller's keys (prefix + meta, never hash)
export async function GET() {
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

  const { data: keys } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, key_prefix, scope, monthly_count, monthly_limit, last_used_at, created_at, revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return Response.json({ data: keys ?? [] });
}

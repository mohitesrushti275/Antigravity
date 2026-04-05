import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const UpdateUserSchema = z.object({
  bio: z.string().max(500).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/).optional(),
  avatar_url: z.string().url().optional(),
  github_url: z.string().url().optional().nullable(),
  twitter_url: z.string().url().optional().nullable(),
  website_url: z.string().url().optional().nullable(),
});

// GET /api/me — Current user profile + liked IDs + key prefixes
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Get liked component IDs
  const { data: likes } = await supabaseAdmin
    .from("likes")
    .select("component_id")
    .eq("user_id", user.id);

  // Get API key prefixes
  const { data: keys } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, key_prefix, scope, monthly_count, monthly_limit, created_at, last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return Response.json({
    data: {
      ...user,
      likedComponentIds: (likes ?? []).map((l) => l.component_id),
      apiKeys: keys ?? [],
    },
  });
}

// PATCH /api/me — Update profile
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  // Check username uniqueness if changing
  if (parsed.data.username) {
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", parsed.data.username)
      .neq("clerk_id", userId)
      .single();

    if (existing) {
      return Response.json({ error: "Username already taken", code: "CONFLICT" }, { status: 409 });
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from("users")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("clerk_id", userId)
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Update failed", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  return Response.json({ data: updated });
}

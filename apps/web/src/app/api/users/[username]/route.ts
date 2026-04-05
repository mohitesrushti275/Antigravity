import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/users/:username — Public profile + components
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, username, avatar_url, bio, github_url, twitter_url, website_url, created_at")
    .eq("username", username)
    .single();

  if (error || !user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const { data: components } = await supabaseAdmin
    .from("components")
    .select("id, name, slug, description, download_count, like_count, status, published_at, categories(slug, name)")
    .eq("user_id", user.id)
    .in("status", ["posted", "featured"])
    .order("download_count", { ascending: false })
    .limit(50);

  const totalDownloads = (components ?? []).reduce((sum, c) => sum + (c.download_count ?? 0), 0);

  return Response.json({
    data: {
      ...user,
      components: components ?? [],
      stats: {
        componentCount: components?.length ?? 0,
        totalDownloads,
      },
    },
  });
}

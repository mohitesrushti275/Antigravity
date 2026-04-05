import { supabaseAdmin } from "@/lib/supabase/admin";
import { cache } from "@/lib/cache";

// GET /api/tags — All tags for autocomplete
export async function GET() {
  const cached = await cache.get<unknown[]>("tags:all");
  if (cached) return Response.json({ data: cached });


  const { data: tags } = await supabaseAdmin
    .from("tags")
    .select("id, slug, name")
    .order("name");

  await cache.set("tags:all", tags ?? [], 1800); // 30 min

  return Response.json({ data: tags ?? [] });
}

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cache, CacheKeys } from "@/lib/cache";

// GET /api/components/:id/source — Source bundle (all files)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cached = await cache.get<Record<string, unknown>>(`source:${id}`);
  if (cached) return Response.json({ data: cached });

  const { data: component, error } = await supabaseAdmin
    .from("components")
    .select("id, name, slug, status, npm_dependencies, license, registry_version, user_id, users(username)")
    .eq("id", id)
    .in("status", ["posted", "featured"])
    .single();

  if (error || !component) {
    return Response.json({ error: "Component not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const { data: files } = await supabaseAdmin
    .from("component_files")
    .select("id, file_type, r2_key, filename, size_bytes, content_type")
    .eq("component_id", id);

  // Group files by type
  const bundle: Record<string, unknown> = {
    component: null,
    demo: null,
    css: null,
    config: null,
    tailwind: null,
  };

  for (const f of files ?? []) {
    const cdnUrl = `${process.env.NEXT_PUBLIC_CDN_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/${f.r2_key}`;
    bundle[f.file_type] = {
      filename: f.filename,
      url: cdnUrl,
      size: f.size_bytes,
      contentType: f.content_type,
    };
  }

  const result = {
    ...component,
    files: bundle,
  };

  await cache.set(`source:${id}`, result, 600); // 10 min
  return Response.json({ data: result });
}

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /r/:username/:slug — shadcn registry endpoint
// This serves the component in the shadcn registry format for:
// npx shadcn@latest add "${APP_URL}/r/username/slug"
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  const { username, slug } = await params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://21st.dev';

  // Lookup user
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (!user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Lookup component
  const { data: component } = await supabaseAdmin
    .from("components")
    .select("id, name, slug, description, npm_dependencies, registry_version, license")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .in("status", ["posted", "featured"])
    .single();

  if (!component) {
    return Response.json({ error: "Component not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Fetch component files
  const { data: files } = await supabaseAdmin
    .from("component_files")
    .select("file_type, r2_key, filename, content_type")
    .eq("component_id", component.id);

  const componentFile = files?.find((f: { file_type: string }) => f.file_type === "component");
  const cssFile = files?.find((f: { file_type: string }) => f.file_type === "css");
  const tailwindFile = files?.find((f: { file_type: string }) => f.file_type === "tailwind");

  // Build shadcn registry item format (v2)
  const registryItem = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: component.slug,
    type: "registry:ui",
    title: component.name,
    description: component.description,
    dependencies: component.npm_dependencies ?? [],
    files: [
      ...(componentFile
        ? [{
            path: `components/ui/${componentFile.filename}`,
            type: "registry:ui" as const,
            content: "", // Content would be fetched from R2/S3
            target: `components/ui/${componentFile.filename}`,
          }]
        : []),
      ...(cssFile
        ? [{
            path: cssFile.filename,
            type: "registry:style" as const,
            content: "",
            target: `styles/${cssFile.filename}`,
          }]
        : []),
      ...(tailwindFile
        ? [{
            path: tailwindFile.filename,
            type: "registry:config" as const,
            content: "",
            target: tailwindFile.filename,
          }]
        : []),
    ],
    registryVersion: component.registry_version,
    license: component.license,
    source: `${appUrl}/${username}/${slug}`,
  };

  // Log download
  await supabaseAdmin.from("downloads").insert({
    component_id: component.id,
    install_method: "cli",
  });

  return Response.json(registryItem, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

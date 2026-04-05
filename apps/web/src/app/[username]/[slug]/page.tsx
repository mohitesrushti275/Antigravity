import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Download, Heart, ArrowLeft, ExternalLink, Code2, Calendar } from "lucide-react";
import { CopyButton, LivePreview } from "./client-components";

// ═══════════════════════════════════════════════════
// COMPONENT DETAIL PAGE — /[username]/[slug]
// Server component with SSR + metadata
// ═══════════════════════════════════════════════════

// ISR: revalidate every 5 minutes
export const revalidate = 300;

async function getComponent(username: string, slug: string) {

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, username, avatar_url, bio")
    .eq("username", username)
    .single();

  if (!user) return null;

  const { data: component } = await supabaseAdmin
    .from("components")
    .select(`
      id, name, slug, description, status, download_count, like_count,
      npm_dependencies, license, published_at, created_at,
      categories(slug, name),
      component_files(id, file_type, r2_key, filename, size_bytes)
    `)
    .eq("user_id", user.id)
    .eq("slug", slug)
    .in("status", ["posted", "featured"])
    .single();

  if (!component) return null;

  // Get demos
  const { data: demos } = await supabaseAdmin
    .from("component_demos")
    .select("id, name, preview_image_key, video_key, display_order")
    .eq("component_id", component.id)
    .order("display_order");

  // Get tags
  const { data: tags } = await supabaseAdmin
    .from("component_tags")
    .select("tags(slug, name)")
    .eq("component_id", component.id);

  // Try to fetch source code for preview
  let sourceCode = "";
  const mainFile = (component.component_files as Array<{ file_type: string; r2_key: string }>)
    ?.find((f) => f.file_type === "component");

  if (mainFile?.r2_key && process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${mainFile.r2_key}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) sourceCode = await res.text();
    } catch {
      // Source code not available — preview will show placeholder
    }
  }

  return {
    ...component,
    author: user,
    demos: demos ?? [],
    tags: tags?.map((t) => (t as unknown as { tags: { slug: string; name: string } }).tags) ?? [],
    sourceCode,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const component = await getComponent(username, slug);
  if (!component) return { title: "Not Found" };
  return {
    title: `${component.name} by @${component.author.username} — 21st.dev`,
    description: component.description,
    openGraph: {
      title: component.name,
      description: component.description,
      type: "article",
    },
  };
}

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const component = await getComponent(username, slug);

  if (!component) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://21st.dev';
  const installCmd = `npx shadcn@latest add "${appUrl}/r/${username}/${slug}"`;
  const deps = (component.npm_dependencies as string[]) ?? [];
  const files = (component.component_files as Array<{ file_type: string; filename: string; size_bytes: number }>) ?? [];

  return (
    <div className="max-w-5xl mx-auto p-8 pb-20">
      {/* Back link */}
      <Link href="/components" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to components
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{component.name}</h1>
              {component.status === "featured" && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  ★ Featured
                </span>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">{component.description}</p>
          </div>
        </div>

        {/* Author + stats */}
        <div className="flex items-center gap-6">
          <Link href={`/${username}`} className="flex items-center gap-2 hover:text-primary transition-colors">
            {component.author.avatar_url ? (
              <Image src={component.author.avatar_url} alt={username} width={32} height={32} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
                {username[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium">@{username}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Download className="w-4 h-4" />{component.download_count.toLocaleString()} installs</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{component.like_count.toLocaleString()} likes</span>
            {component.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(component.published_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {component.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {(component.tags as { slug: string; name: string }[]).map((tag) => (
              <span key={tag.slug} className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent/50 text-muted-foreground border border-border">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Category */}
        {component.categories && (
          <Link
            href={`/s/${(component.categories as unknown as { slug: string; name: string }).slug}`}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {(component.categories as unknown as { slug: string; name: string }).name} →
          </Link>
        )}
      </div>

      {/* ═══ Live Preview + Source Code ═══ */}
      <div className="mb-8">
        <LivePreview code={component.sourceCode} componentName={component.name} />
      </div>

      {/* Install section */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Code2 className="w-5 h-5 text-primary" /> Installation
        </h2>
        <div className="bg-background rounded-lg p-4 font-mono text-sm border border-border flex items-center justify-between gap-4">
          <code className="text-foreground break-all">{installCmd}</code>
          <CopyButton text={installCmd} />
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Files</h2>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border text-sm">
                <span className="font-mono text-foreground">{f.filename}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-accent text-xs">{f.file_type}</span>
                  <span>{(f.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {deps.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Dependencies</h2>
          <div className="flex flex-wrap gap-2">
            {deps.map((dep) => (
              <a
                key={dep}
                href={`https://www.npmjs.com/package/${dep}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-sm hover:border-primary/50 transition-colors"
              >
                {dep}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* License */}
      <div className="text-sm text-muted-foreground text-center pt-8 border-t border-border">
        Licensed under {component.license ?? "MIT"}
      </div>
    </div>
  );
}

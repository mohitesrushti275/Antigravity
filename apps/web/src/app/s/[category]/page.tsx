import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Heart } from "lucide-react";

// ═══════════════════════════════════════════════════
// CATEGORY BROWSE PAGE — /s/[category]
// ═══════════════════════════════════════════════════

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';
// ISR: revalidate every 5 minutes
export const revalidate = 300;

interface CategoryComponent {
  id: string;
  name: string;
  slug: string;
  description: string;
  download_count: number;
  like_count: number;
  published_at: string;
  users: { username: string; avatar_url?: string } | null;
  categories: { slug: string } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return {
    title: `${category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Components — 21st.dev`,
    description: `Browse ${category} components on 21st.dev`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, section, component_count")
    .eq("slug", category)
    .single();

  if (!cat) notFound();

  const { data: components } = await supabaseAdmin
    .from("components")
    .select("id, name, slug, description, download_count, like_count, published_at, users(username, avatar_url), categories(slug)")
    .eq("category_id", cat.id)
    .in("status", ["posted", "featured"])
    .order("download_count", { ascending: false })
    .limit(50);

  return (
    <div className="p-8 pb-20 max-w-6xl mx-auto">
      <div className="mb-8 border-b border-border pb-6">
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3 inline-block">
          {cat.section}
        </span>
        <h1 className="text-3xl font-bold text-foreground">{cat.name}</h1>
        <p className="text-muted-foreground mt-2">{cat.component_count} components in this category</p>
      </div>

      {(!components || components.length === 0) ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">No components in this category yet.</p>
          <Link href="/publish" className="text-primary text-sm mt-2 inline-block hover:underline">Be the first to publish →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(components as unknown as CategoryComponent[]).map((c) => (
            <Link
              key={c.id}
              href={`/${c.users?.username}/${c.slug}`}
              className="group border border-border bg-card rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <h3 className="font-medium text-foreground text-lg group-hover:text-primary transition-colors mb-2">
                {c.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{c.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Download className="w-3 h-3" />{c.download_count}</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{c.like_count}</span>
                <span>@{c.users?.username}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

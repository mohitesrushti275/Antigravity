"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Compass, Search, Download, Heart } from "lucide-react";

// ═══════════════════════════════════════════════════
// COMPONENTS BROWSE PAGE (Client Component for search)
// ═══════════════════════════════════════════════════

type Component = {
  id: string;
  slug: string;
  name: string;
  description: string;
  download_count: number;
  like_count: number;
  published_at: string;
  users: { username: string; avatar_url: string | null };
  categories: { slug: string } | null;
};

type SortOption = "newest" | "popular" | "trending";

function ComponentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const category = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") ?? "newest") as SortOption;
  const q = searchParams.get("q") ?? "";

  useEffect(() => {
    async function fetchComponents() {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("limit", "12");

      try {
        const res = await fetch(`/api/components?${params.toString()}`);
        const json = await res.json();
        setComponents(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      } catch {
        setComponents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchComponents();
  }, [category, sort, q, page]);

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    params.set("page", "1");
    router.push(`/components?${params.toString()}`);
  }

  function handleSort(newSort: SortOption) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    params.set("page", "1");
    router.push(`/components?${params.toString()}`);
  }

  return (
    <div className="p-8 pb-20">
      {/* Header + Search */}
      <div className="flex flex-col gap-4 mb-8 border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Components</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {total > 0 ? `${total} components` : "Browse the component registry"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["newest", "popular", "trending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSort(s)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sort === s
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search components..."
            defaultValue={q}
            onChange={(e) => {
              clearTimeout((window as unknown as Record<string, unknown>).__searchTimeout as number);
              (window as unknown as Record<string, unknown>).__searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
            }}
            className="w-full bg-accent/20 border border-border rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow text-foreground"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border bg-card rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-accent rounded w-3/4 mb-3" />
              <div className="h-3 bg-accent rounded w-full mb-2" />
              <div className="h-3 bg-accent rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : components.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl border-border">
          <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No components found</p>
          <p className="text-sm text-muted-foreground">Try a different search or category filter.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {components.map((c) => (
              <Link
                key={c.id}
                href={`/${c.users?.username}/${c.slug}`}
                className="group border border-border bg-card rounded-xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-foreground text-lg group-hover:text-primary transition-colors truncate pr-2">
                      {c.name}
                    </h3>
                    {c.categories && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                        {c.categories.slug}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {c.download_count?.toLocaleString() ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {c.like_count?.toLocaleString() ?? 0}
                    </span>
                    <span>by @{c.users?.username}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-accent rounded-lg disabled:opacity-40 hover:bg-accent/80 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 12 >= total}
                className="px-4 py-2 text-sm bg-accent rounded-lg disabled:opacity-40 hover:bg-accent/80 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse text-muted-foreground">Loading components...</div>}>
      <ComponentsContent />
    </Suspense>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { Search as SearchIcon, Download, Heart, Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════
// SEARCH RESULTS PAGE — /search
// ═══════════════════════════════════════════════════

interface Component {
  id: string;
  name: string;
  slug: string;
  description: string;
  download_count: number;
  like_count: number;
  users?: { username: string; avatar_url?: string };
  categories?: { slug: string; name: string };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<Component[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;

    const search = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data ?? []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [query]);

  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Search Results</h1>
        {query && (
          <p className="text-muted-foreground">
            {searched && !loading ? `${results.length} result${results.length !== 1 ? "s" : ""} for ` : "Searching for "}
            <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
          </p>
        )}
      </div>

      {!query.trim() ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <SearchIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Enter a search term to find components</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-xl">
          <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No components found</p>
          <p className="text-sm text-muted-foreground/60">Try different keywords or browse categories</p>
          <Link href="/components" className="text-primary text-sm mt-4 inline-block hover:underline">
            Browse all components →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((c) => (
            <Link
              key={c.id}
              href={`/${c.users?.username}/${c.slug}`}
              className="group block border border-border bg-card rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                    {c.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {c.users && <span>@{c.users.username}</span>}
                    {c.categories && <span className="text-blue-400">{c.categories.name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{c.download_count}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{c.like_count}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Search, Bell, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ═══════════════════════════════════════════════════
// TOPBAR — Search + Auth controls
// ═══════════════════════════════════════════════════

export function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/components?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components or templates..."
            className="w-64 md:w-96 bg-accent border border-border rounded-md pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow text-foreground"
          />
        </div>
      </form>

      {/* Right side: Auth + Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/docs"
          className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground hidden md:block"
        >
          Docs
        </Link>

        <SignedIn>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Submit
          </Link>
          <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
            <Bell className="w-4 h-4" />
          </button>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}

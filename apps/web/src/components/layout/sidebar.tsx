"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Compass, LayoutTemplate, Settings, Sparkles, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// ═══════════════════════════════════════════════════
// SIDEBAR — Main navigation
// ═══════════════════════════════════════════════════

const primaryRoutes = [
  { name: "Explore", href: "/", icon: Compass },
  { name: "Components", href: "/components", icon: Code2 },
  { name: "Magic Chat", href: "/magic", icon: Sparkles },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
];

const categoryLinks = [
  { name: "Heroes", href: "/components?category=hero" },
  { name: "Navigation", href: "/components?category=navbar-navigation" },
  { name: "Buttons", href: "/components?category=button" },
  { name: "Cards", href: "/components?category=card" },
  { name: "Inputs", href: "/components?category=input" },
  { name: "Forms", href: "/components?category=form" },
  { name: "Footers", href: "/components?category=footer" },
  { name: "Testimonials", href: "/components?category=testimonials" },
  { name: "Pricing", href: "/components?category=pricing-section" },
  { name: "Call to Action", href: "/components?category=call-to-action" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-background transition-transform flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
            <Code2 className="w-4 h-4" />
          </div>
          21st Builder
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {primaryRoutes.map((route) => {
          const isActive = pathname === route.href || (route.href !== "/" && pathname.startsWith(route.href));
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/50 text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <route.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {route.name}
            </Link>
          );
        })}

        {/* Categories Collapsible */}
        <div className="pt-6 pb-2">
          <button
            onClick={() => setCategoriesOpen(!categoriesOpen)}
            className="flex items-center justify-between w-full px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Browse by Category
            {categoriesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>

        {categoriesOpen &&
          categoryLinks.map((cat) => {
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const isActive = pathname + search === cat.href;
            return (
              <Link
                key={cat.href}
                href={cat.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/50 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-border mt-auto space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Shield className="w-4 h-4" />
          Admin
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

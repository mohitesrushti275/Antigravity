"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LayoutDashboard, Users, ClipboardList, BarChart3, ScrollText, Boxes, Palette, Code2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";

// ═══════════════════════════════════════════════════
// ADMIN LAYOUT — Admin auth guard wrapper
// ═══════════════════════════════════════════════════

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/components", label: "Components", icon: Boxes },
  { href: "/admin/entries", label: "Design Entries", icon: Palette },
  { href: "/admin/queue", label: "Review Queue", icon: ClipboardList },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check admin role from Clerk metadata
  const role = user?.publicMetadata?.role;
  if (!user || role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin sidebar — fixed, full-height */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-background flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            21st Builder
          </Link>
        </div>

        {/* Admin nav */}
        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-2 text-foreground">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-semibold">Admin Panel</span>
          </div>
          {adminLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content area — offset by sidebar width */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-card/[0.02]">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

// ═══════════════════════════════════════════════════
// APP SHELL — Conditionally wraps pages with sidebar/topbar
// Hides chrome on landing (/), sign-in, and sign-up pages
// ═══════════════════════════════════════════════════

const FULL_SCREEN_ROUTES = ["/", "/sign-in", "/sign-up", "/admin"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Landing, sign-in, and sign-up pages render full screen (no sidebar/topbar)
  const isFullScreen = FULL_SCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isFullScreen) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen relative">
        <Topbar />
        <main className="flex-1 bg-card/[0.02] overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

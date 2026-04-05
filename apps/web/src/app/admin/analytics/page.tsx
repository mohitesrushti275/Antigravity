"use client";

import { useState, useEffect } from "react";
import { BarChart3, Loader2, Download, Code2, Users } from "lucide-react";

// ═══════════════════════════════════════════════════
// ADMIN ANALYTICS PAGE — /admin/analytics
// Detailed analytics dashboard
// ═══════════════════════════════════════════════════

interface Analytics {
  overview: {
    totalComponents: number;
    totalUsers: number;
    pendingReview: number;
    recentDownloads: number;
    recentSignups: number;
  };
  topComponents: Array<{
    id: string;
    name: string;
    slug: string;
    download_count: number;
    like_count: number;
    users?: { username: string };
  }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const stats = data?.overview;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-primary" /> Analytics
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1"><Code2 className="w-4 h-4 text-blue-400" /><span className="text-sm text-muted-foreground">Total Components</span></div>
          <p className="text-3xl font-bold text-foreground">{stats?.totalComponents ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-green-400" /><span className="text-sm text-muted-foreground">Total Users</span></div>
          <p className="text-3xl font-bold text-foreground">{stats?.totalUsers ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1"><Download className="w-4 h-4 text-purple-400" /><span className="text-sm text-muted-foreground">Downloads (30d)</span></div>
          <p className="text-3xl font-bold text-foreground">{stats?.recentDownloads ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-pink-400" /><span className="text-sm text-muted-foreground">Signups (30d)</span></div>
          <p className="text-3xl font-bold text-foreground">{stats?.recentSignups ?? 0}</p>
        </div>
      </div>

      {/* Top components table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Top 10 Components by Downloads</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Component</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Author</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Downloads</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Likes</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topComponents ?? []).map((c, i) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="py-3 px-4 text-muted-foreground font-mono">{i + 1}</td>
                <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                <td className="py-3 px-4 text-muted-foreground">@{c.users?.username}</td>
                <td className="py-3 px-4 text-right text-foreground">{c.download_count.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-foreground">{c.like_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

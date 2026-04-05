"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, Code2, Download, Clock, Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════
// ADMIN DASHBOARD — /admin
// Overview stats + top components
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
  recentActions: Array<{
    action: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
}

export default function AdminDashboard() {
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
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.overview ?? { totalComponents: 0, totalUsers: 0, pendingReview: 0, recentDownloads: 0, recentSignups: 0 };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Code2} label="Components" value={stats.totalComponents} color="text-blue-400" />
        <StatCard icon={Users} label="Users" value={stats.totalUsers} color="text-green-400" />
        <StatCard icon={Clock} label="Pending Review" value={stats.pendingReview} color="text-yellow-400" />
        <StatCard icon={Download} label="Downloads (30d)" value={stats.recentDownloads} color="text-purple-400" />
        <StatCard icon={Users} label="Signups (30d)" value={stats.recentSignups} color="text-pink-400" />
      </div>

      {/* Top components */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Top Components
        </h2>
        <div className="space-y-2">
          {(data?.topComponents ?? []).map((c, i) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-center font-mono">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">@{c.users?.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{c.download_count.toLocaleString()} installs</span>
                <span>{c.like_count.toLocaleString()} likes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {(data?.recentActions ?? []).slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 text-sm">
              <code className="text-xs text-foreground bg-accent px-2 py-0.5 rounded">{a.action}</code>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

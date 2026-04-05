"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, X, Star, Eye, AlertCircle } from "lucide-react";

// ═══════════════════════════════════════════════════
// ADMIN REVIEW QUEUE — /admin/queue
// ═══════════════════════════════════════════════════

interface QueueItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  created_at: string;
  users?: { username: string; avatar_url?: string };
}

export default function AdminQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/queue");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

  const handleAction = async (id: string, action: "approve" | "reject" | "feature") => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/review/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // error handling
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
        <span className="px-3 py-1 text-sm rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          {items.length} pending
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Check className="w-12 h-12 text-green-400/30 mx-auto mb-3" />
          <p className="text-muted-foreground">All caught up! No components pending review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground text-lg">{item.name}</h3>
                    <span className="px-2 py-0.5 text-xs rounded bg-accent text-muted-foreground">{item.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>@{item.users?.username}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="font-mono text-muted-foreground/60">{item.slug}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {acting === item.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(item.id, "reject")}
                        className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "approve")}
                        className="p-2 rounded-lg border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-colors"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "feature")}
                        className="p-2 rounded-lg border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        title="Feature"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

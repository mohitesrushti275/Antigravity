"use client";

import { useState, useEffect } from "react";
import { Loader2, ScrollText, Filter } from "lucide-react";

// ═══════════════════════════════════════════════════
// ADMIN AUDIT LOG PAGE — /admin/audit
// Filterable audit log viewer
// ═══════════════════════════════════════════════════

interface AuditEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 50;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/admin/audit?${params}`);
      const json = await res.json();
      setLogs(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page, actionFilter]);

  const actionColors: Record<string, string> = {
    "admin.review": "text-green-400 bg-green-500/10",
    "admin.user_updated": "text-blue-400 bg-blue-500/10",
    "api_key.created": "text-purple-400 bg-purple-500/10",
    "api_key.revoked": "text-red-400 bg-red-500/10",
    "magic.generate": "text-yellow-400 bg-yellow-500/10",
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <ScrollText className="w-6 h-6 text-primary" /> Audit Log
      </h1>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All actions</option>
          <option value="admin.review">Admin Review</option>
          <option value="admin.user_updated">User Updated</option>
          <option value="api_key.created">API Key Created</option>
          <option value="api_key.revoked">API Key Revoked</option>
          <option value="magic.generate">Magic Generate</option>
        </select>
        <span className="text-sm text-muted-foreground">{total} entries</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-xl">No audit entries found.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const colorClass = Object.entries(actionColors).find(([k]) => log.action.startsWith(k))?.[1] ?? "text-muted-foreground bg-accent";
            return (
              <div key={log.id} className="flex items-start justify-between gap-4 p-4 bg-card border border-border rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className={`px-2 py-0.5 rounded text-xs font-mono ${colorClass}`}>{log.action}</code>
                    <span className="text-xs text-muted-foreground">{log.resource_type}/{log.resource_id?.slice(0, 8)}</span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="text-xs text-muted-foreground font-mono mt-1 max-w-lg truncate">{JSON.stringify(log.metadata)}</pre>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
        <span>Page {page} of {Math.ceil(total / limit) || 1}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50">Previous</button>
          <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}

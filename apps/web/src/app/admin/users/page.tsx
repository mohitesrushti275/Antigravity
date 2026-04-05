"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";

// ═══════════════════════════════════════════════════
// ADMIN USERS PAGE — /admin/users
// User management with search, role changes, ban/unban
// ═══════════════════════════════════════════════════

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  componentCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (query) params.set("q", query);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setUsers(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, query, limit]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateUser = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadUsers();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">User Management</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search by username or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <p className="text-sm text-muted-foreground mb-4">{total} users total</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Components</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt="" width={24} height={24} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-accent text-xs flex items-center justify-center font-medium">
                            {u.username?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <span className="font-medium text-foreground">@{u.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-foreground">{u.componentCount}</td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== "admin" ? (
                          <button
                            onClick={() => updateUser(u.id, { role: "admin" })}
                            className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Make Admin"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUser(u.id, { role: "user" })}
                            className="p-1.5 rounded text-primary hover:text-muted-foreground hover:bg-accent transition-colors"
                            title="Remove Admin"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page} of {Math.ceil(total / limit)}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

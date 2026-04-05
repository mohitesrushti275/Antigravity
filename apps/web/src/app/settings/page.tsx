"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { User, Key, Copy, Loader2, AlertCircle, Check, Plus, Trash2 } from "lucide-react";

// ═══════════════════════════════════════════════════
// SETTINGS PAGE — /settings
// Account settings + API key management
// ═══════════════════════════════════════════════════

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key?: string;
  scope: string;
  monthly_count: number;
  monthly_limit: number;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const [tab, setTab] = useState<"profile" | "keys">("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile state
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // API keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setBio(j.data.bio ?? "");
          setGithubUrl(j.data.github_url ?? "");
          setTwitterUrl(j.data.twitter_url ?? "");
          setWebsiteUrl(j.data.website_url ?? "");
        }
      })
      .catch(() => {});
  }, []);

  // Load keys
  useEffect(() => {
    if (tab === "keys") {
      setLoadingKeys(true);
      fetch("/api/keys")
        .then((r) => r.json())
        .then((j) => setKeys(j.data ?? []))
        .catch(() => {})
        .finally(() => setLoadingKeys(false));
    }
  }, [tab]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio || undefined,
          github_url: githubUrl || null,
          twitter_url: twitterUrl || null,
          website_url: websiteUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setMessage({ type: "success", text: "Profile updated!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, scope: "magic" }),
      });
      const { data } = await res.json();
      setNewKey(data.key);
      setKeys((prev) => [data, ...prev]);
      setNewKeyName("");
    } catch {
      setMessage({ type: "error", text: "Failed to create key" });
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setMessage({ type: "error", text: "Failed to revoke key" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 pb-20">
      <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit mb-8">
        <button
          onClick={() => setTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "profile" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <User className="w-4 h-4" /> Profile
        </button>
        <button
          onClick={() => setTab("keys")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "keys" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Key className="w-4 h-4" /> API Keys
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 mb-6 rounded-lg text-sm ${message.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-xl font-bold text-foreground">
              {clerkUser?.firstName?.[0] ?? "U"}
            </div>
            <div>
              <p className="font-medium text-foreground">{clerkUser?.fullName ?? "User"}</p>
              <p className="text-sm text-muted-foreground">{clerkUser?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Tell the community about yourself..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">GitHub URL</label>
            <input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="https://github.com/username" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Twitter URL</label>
            <input type="url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="https://twitter.com/username" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
            <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="https://yoursite.com" />
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* API Keys tab */}
      {tab === "keys" && (
        <div className="space-y-6">
          {newKey && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm text-green-400 font-medium mb-2">🔑 Your new API key (copy now — it won&apos;t be shown again):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-background/50 rounded-lg font-mono text-sm text-foreground break-all">{newKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null); }}
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name (e.g. 'My App')"
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button onClick={createKey} disabled={!newKeyName.trim()}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Key
            </button>
          </div>

          {loadingKeys ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : keys.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">No API keys yet. Create one to access the Magic API.</p>
          ) : (
            <div className="space-y-3">
              {keys.filter(k => !k.revoked_at).map((k) => (
                <div key={k.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{k.key_prefix}••••••••</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {k.monthly_count}/{k.monthly_limit} calls · {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
                    </p>
                  </div>
                  <button onClick={() => revokeKey(k.id)} className="p-2 text-muted-foreground hover:text-red-400 transition-colors" title="Revoke">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

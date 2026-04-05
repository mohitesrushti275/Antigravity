"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, Plus, Search, Upload, Edit3, Trash2, Star, Check,
  X, Image, FileCode, ArrowUpDown, ExternalLink, AlertCircle
} from "lucide-react";

// ═══════════════════════════════════════════════════
// ADMIN COMPONENTS PAGE — /admin/components
// Full CMS for managing what users see:
//   • Create components directly
//   • Upload source files + preview images
//   • Set status (draft → posted → featured)
//   • Edit/delete any component
// ═══════════════════════════════════════════════════

interface Component {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  download_count: number;
  like_count: number;
  category_id?: string;
  published_at?: string;
  created_at: string;
  users?: { username: string };
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

type ModalMode = "create" | "edit" | "upload" | null;

export default function AdminComponentsPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");

  // Modal state
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formLicense, setFormLicense] = useState("MIT");
  const [formDeps, setFormDeps] = useState("");
  const [formStatus, setFormStatus] = useState("draft");

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load data ──────────────────────────────────
  const loadComponents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (statusFilter) params.set("status", statusFilter);
      params.set("sort", sortBy);
      params.set("limit", "100");

      // Use admin endpoint that returns ALL statuses
      const res = await fetch(`/api/admin/components?${params}`);
      const json = await res.json();
      setComponents(json.data ?? []);
    } catch {
      setComponents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComponents(); }, [query, statusFilter, sortBy]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []))
      .catch(() => {});
  }, []);

  // ─── Auto-slug ──────────────────────────────────
  useEffect(() => {
    if (modal === "create") {
      setFormSlug(formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }, [formName, modal]);

  // ─── Clear messages ─────────────────────────────
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ─── Open modals ────────────────────────────────
  const openCreate = () => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormCategoryId("");
    setFormLicense("MIT");
    setFormDeps("");
    setFormStatus("draft");
    setEditingComponent(null);
    setError(null);
    setModal("create");
  };

  const openEdit = (c: Component) => {
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormDescription(c.description);
    setFormCategoryId(c.category_id ?? "");
    setFormStatus(c.status);
    setEditingComponent(c);
    setError(null);
    setModal("edit");
  };

  const openUpload = (c: Component) => {
    setEditingComponent(c);
    setUploadFiles([]);
    setUploadProgress("");
    setError(null);
    setModal("upload");
  };

  // ─── Create component ───────────────────────────
  const handleCreate = async () => {
    if (!formName.trim() || !formDescription.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          description: formDescription,
          category_id: formCategoryId || undefined,
          license: formLicense,
          npm_dependencies: formDeps.split(",").map((d) => d.trim()).filter(Boolean),
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      setSuccess("Component created!");
      setModal(null);
      loadComponents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  // ─── Update component ──────────────────────────
  const handleUpdate = async () => {
    if (!editingComponent) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/components/${editingComponent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          description: formDescription,
          category_id: formCategoryId || undefined,
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      setSuccess("Component updated!");
      setModal(null);
      loadComponents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  // ─── Upload files ──────────────────────────────
  const handleUpload = async () => {
    if (!editingComponent || uploadFiles.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const uploadedKeys: string[] = [];

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setUploadProgress(`Uploading ${i + 1}/${uploadFiles.length}: ${file.name}`);

        const fileType = file.name.endsWith(".tsx") || file.name.endsWith(".ts")
          ? "component"
          : file.name.endsWith(".css")
          ? "css"
          : file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "config";

        // Get presigned URL
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            componentId: editingComponent.id,
            fileType,
            contentType: file.type || "text/plain",
            sizeBytes: file.size,
            filename: file.name,
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json();
          throw new Error(err.error || `Presign failed for ${file.name}`);
        }

        const { data: presignData } = await presignRes.json();

        // Direct upload to S3/R2
        await fetch(presignData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "text/plain" },
        });

        uploadedKeys.push(presignData.r2Key);
      }

      setUploadProgress("Confirming upload...");

      // Confirm all uploads
      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: editingComponent.id,
          fileKeys: uploadedKeys,
        }),
      });

      if (!confirmRes.ok) throw new Error("Confirm failed");

      setSuccess(`${uploadFiles.length} file(s) uploaded!`);
      setModal(null);
      loadComponents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // ─── Quick status change ────────────────────────
  const quickStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/components/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setSuccess(`Status → ${status}`);
      loadComponents();
    } catch {
      setError("Failed to update status");
    }
  };

  // ─── Delete component ──────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will soft-delete it.`)) return;
    try {
      await fetch(`/api/components/${id}`, { method: "DELETE" });
      setSuccess("Component deleted");
      loadComponents();
    } catch {
      setError("Failed to delete");
    }
  };

  // ─── Status badge ───────────────────────────────
  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      on_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      posted: "bg-green-500/10 text-green-400 border-green-500/20",
      featured: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      deleted: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return `px-2 py-0.5 text-xs font-medium rounded-full border ${colors[s] ?? colors.draft}`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Components</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all components shown to users</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Component
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search components..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="on_review">On Review</option>
          <option value="posted">Posted</option>
          <option value="featured">Featured</option>
          <option value="deleted">Deleted</option>
        </select>

        <button onClick={() => setSortBy(sortBy === "newest" ? "popular" : "newest")}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortBy === "newest" ? "Newest" : "Popular"}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : components.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground mb-2">No components found</p>
          <button onClick={openCreate} className="text-primary text-sm hover:underline">Create your first component →</button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Component</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Author</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Downloads</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Likes</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">@{c.users?.username ?? "—"}</td>
                  <td className="py-3 px-4">
                    <span className={statusBadge(c.status)}>{c.status.replace("_", " ")}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-foreground">{c.download_count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-foreground">{c.like_count.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick status buttons */}
                      {c.status !== "posted" && c.status !== "deleted" && (
                        <button onClick={() => quickStatus(c.id, "posted")} title="Publish"
                          className="p-1.5 rounded text-green-400 hover:bg-green-500/10 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {c.status !== "featured" && c.status !== "deleted" && (
                        <button onClick={() => quickStatus(c.id, "featured")} title="Feature"
                          className="p-1.5 rounded text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Upload files */}
                      <button onClick={() => openUpload(c)} title="Upload files"
                        className="p-1.5 rounded text-blue-400 hover:bg-blue-500/10 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button onClick={() => openEdit(c)} title="Edit"
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* View on site */}
                      {(c.status === "posted" || c.status === "featured") && c.users?.username && (
                        <a href={`/${c.users.username}/${c.slug}`} target="_blank" rel="noopener noreferrer" title="View"
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Delete */}
                      <button onClick={() => handleDelete(c.id, c.name)} title="Delete"
                        className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ MODAL OVERLAY ═══ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !saving && !uploading && setModal(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>

            {/* ── Create / Edit Modal ── */}
            {(modal === "create" || modal === "edit") && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    {modal === "create" ? "New Component" : `Edit: ${editingComponent?.name}`}
                  </h2>
                  <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Shimmer Button"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
                    <input type="text" value={formSlug} onChange={(e) => setFormSlug(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description *</label>
                    <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="A beautifully animated..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                      <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="">None</option>
                        {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="draft">Draft</option>
                        <option value="on_review">On Review</option>
                        <option value="posted">Posted (Public)</option>
                        <option value="featured">Featured ★</option>
                      </select>
                    </div>
                  </div>

                  {modal === "create" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">License</label>
                        <select value={formLicense} onChange={(e) => setFormLicense(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                          <option value="MIT">MIT</option>
                          <option value="Apache-2.0">Apache 2.0</option>
                          <option value="ISC">ISC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">NPM Dependencies</label>
                        <input type="text" value={formDeps} onChange={(e) => setFormDeps(e.target.value)} placeholder="framer-motion, clsx"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition-colors">Cancel</button>
                  <button onClick={modal === "create" ? handleCreate : handleUpdate} disabled={saving || !formName.trim() || !formDescription.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : modal === "create" ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {saving ? "Saving..." : modal === "create" ? "Create" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Upload Modal ── */}
            {modal === "upload" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Upload Files</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{editingComponent?.name}</p>
                  </div>
                  <button onClick={() => setModal(null)} disabled={uploading} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {/* Drop zone */}
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors mb-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-foreground font-medium text-sm mb-1">Drop files or click to browse</p>
                  <p className="text-xs text-muted-foreground">TSX, CSS, images (PNG/WebP/JPG), videos (MP4)</p>
                  <input ref={fileInputRef} type="file" multiple accept=".tsx,.ts,.css,.json,.png,.webp,.jpg,.jpeg,.mp4" className="hidden"
                    onChange={(e) => e.target.files && setUploadFiles((prev) => [...prev, ...Array.from(e.target.files!)])} />
                </div>

                {/* File list */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {uploadFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-lg text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {f.type.startsWith("image/") ? <Image className="w-4 h-4 text-blue-400 shrink-0" /> : <FileCode className="w-4 h-4 text-green-400 shrink-0" />}
                          <span className="font-mono text-foreground truncate">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                          <button onClick={() => setUploadFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadProgress && (
                  <p className="text-xs text-primary mb-4 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> {uploadProgress}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button onClick={() => setModal(null)} disabled={uploading}
                    className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Uploading..." : `Upload ${uploadFiles.length} file(s)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

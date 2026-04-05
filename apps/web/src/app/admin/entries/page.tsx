"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { EntryForm } from "./_components/EntryForm";
import { NewCategoryModal } from "./_components/NewCategoryModal";

// ═══════════════════════════════════════════════════
// ADMIN ENTRIES PAGE — /admin/entries
// Design showcase manager: categories → entries
// Admins create categories, then add design entries
// (title + image + prompt + code) which users browse.
// ═══════════════════════════════════════════════════

interface Category {
  id: string;
  slug: string;
  name: string;
  section: string;
}

interface DesignEntry {
  id: string;
  category_id: string;
  title: string;
  image_url: string;
  image_key?: string;
  prompt: string;
  code: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

export default function AdminEntriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DesignEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<DesignEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // ─── Load categories ────────────────────────────
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── Load entries for selected category ─────────
  useEffect(() => {
    if (!selectedCategoryId) return;

    const loadEntries = async () => {
      setLoadingEntries(true);
      try {
        const res = await fetch(`/api/admin/entries?categoryId=${selectedCategoryId}`);
        const json = await res.json();
        setEntries(json.data ?? []);
      } catch {
        setEntries([]);
      } finally {
        setLoadingEntries(false);
      }
    };

    loadEntries();
  }, [selectedCategoryId]);

  // ─── Refresh entries ────────────────────────────
  const refreshEntries = async () => {
    if (!selectedCategoryId) return;
    const res = await fetch(`/api/admin/entries?categoryId=${selectedCategoryId}`);
    const json = await res.json();
    setEntries(json.data ?? []);
  };

  // ─── Refresh categories ─────────────────────────
  const refreshCategories = async () => {
    const res = await fetch("/api/categories");
    const json = await res.json();
    setCategories(json.data ?? []);
  };

  // ─── Delete entry ────────────────────────────────
  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await fetch(`/api/admin/entries/${id}`, { method: "DELETE" });
      if (editingEntry?.id === id) setEditingEntry(null);
      refreshEntries();
    } catch {
      alert("Failed to delete entry");
    }
  };

  // ─── Delete category ─────────────────────────────
  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this entire category and all its entries?")) return;
    try {
      await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        setEditingEntry(null);
      }
      refreshCategories();
    } catch {
      alert("Failed to delete category");
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-6 p-6">
      {/* ═══ LEFT PANEL — Category List ═══ */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3">Categories</h2>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="w-full py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium border border-primary/20"
          >
            <Plus className="w-4 h-4" /> New Category
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No categories yet.</p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setEditingEntry(null);
                  }}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedCategoryId === cat.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-medium text-sm truncate block">{cat.name}</span>
                    <span className="text-xs opacity-60">{cat.section}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCategory(cat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 rounded transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col min-w-0 bg-card/50 border border-border rounded-xl overflow-hidden">
        {!selectedCategory ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center">
              <Plus className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p>Select a category to manage its design entries</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="p-6 pb-0">
              <h1 className="text-2xl font-bold text-foreground mb-1">{selectedCategory.name}</h1>
              <p className="text-sm text-muted-foreground">
                Manage design entries for this category • {entries.length} entries
              </p>
            </div>

            {/* Entry Form (create / edit) */}
            <div className="p-6">
              <EntryForm
                categoryId={selectedCategory.id}
                initialData={editingEntry}
                onSuccess={() => {
                  setEditingEntry(null);
                  refreshEntries();
                }}
                onCancel={() => setEditingEntry(null)}
              />
            </div>

            {/* Existing Entries */}
            {loadingEntries ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : entries.length > 0 ? (
              <div className="px-6 pb-6 border-t border-border">
                <h3 className="font-semibold text-foreground mt-6 mb-4">
                  Existing Entries ({entries.length})
                </h3>
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                        editingEntry?.id === entry.id
                          ? "bg-primary/5 border-primary/30"
                          : "bg-card border-border hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        {entry.image_url && (
                          <div className="w-12 h-12 flex-shrink-0 bg-accent rounded-lg overflow-hidden border border-border">
                            <img
                              src={entry.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{entry.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {entry.prompt || "No prompt"}
                          </p>
                        </div>
                        {!entry.is_published && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingEntry(entry);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 text-red-400/70 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ═══ Category Modal ═══ */}
      {showCategoryModal && (
        <NewCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSuccess={(newCat: { id: string; name: string }) => {
            setShowCategoryModal(false);
            setSelectedCategoryId(newCat.id);
            refreshCategories();
          }}
        />
      )}
    </div>
  );
}

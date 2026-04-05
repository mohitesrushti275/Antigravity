"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertCircle, X, Plus, Code2 } from "lucide-react";

// ═══════════════════════════════════════════════════
// PUBLISH PAGE — /publish
// Component creation form with file upload
// ═══════════════════════════════════════════════════

interface Category {
  id: string;
  slug: string;
  name: string;
  section: string;
}

export default function PublishPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "upload" | "done">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [componentId, setComponentId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [license, setLicense] = useState("MIT");
  const [deps, setDeps] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug from name
  useEffect(() => {
    setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  }, [name]);

  // Load categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []))
      .catch(() => {});
  }, []);

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          category_id: categoryId || undefined,
          license,
          npm_dependencies: deps.split(",").map((d) => d.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create component");
      }

      const { data } = await res.json();
      setComponentId(data.id);
      setStep("upload");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFiles = async () => {
    if (!componentId || files.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const uploadedKeys: string[] = [];

      for (const file of files) {
        const fileType = file.name.endsWith(".tsx") || file.name.endsWith(".ts")
          ? "component"
          : file.name.endsWith(".css")
          ? "css"
          : "config";

        // Get presigned URL
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            componentId,
            fileType,
            contentType: file.type || "text/plain",
            sizeBytes: file.size,
            filename: file.name,
          }),
        });

        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { data: presignData } = await presignRes.json();

        // Upload to S3/R2
        await fetch(presignData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "text/plain" },
        });

        uploadedKeys.push(presignData.r2Key);
      }

      // Confirm upload
      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId,
          fileKeys: uploadedKeys,
        }),
      });

      if (!confirmRes.ok) throw new Error("Failed to confirm upload");

      setStep("done");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFiles = (newFiles: FileList | null) => {
    if (newFiles) {
      setFiles((prev) => [...prev, ...Array.from(newFiles)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto p-8 pt-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Component Submitted!</h1>
        <p className="text-muted-foreground mb-8">
          Your component is now in review. You&apos;ll be notified when it&apos;s published.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => router.push("/components")}
            className="px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:bg-accent transition-colors"
          >
            Browse Components
          </button>
          <button
            onClick={() => { setStep("details"); setComponentId(null); setFiles([]); setName(""); setSlug(""); setDescription(""); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Publish Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 pb-20">
      <h1 className="text-3xl font-bold text-foreground mb-2">Publish Component</h1>
      <p className="text-muted-foreground mb-8">Share your design system component with the community</p>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${step === "details" ? "bg-primary/10 text-primary border border-primary/30" : "bg-accent text-muted-foreground"}`}>
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
          Details
        </div>
        <div className="w-8 h-px bg-border" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${step === "upload" ? "bg-primary/10 text-primary border border-primary/30" : "bg-accent text-muted-foreground"}`}>
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
          Upload Files
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 1: Details */}
      {step === "details" && (
        <form onSubmit={handleCreateComponent} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Component Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Animated Card"
              required
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">21st.dev/you/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A beautifully animated card component with hover effects..."
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">License</label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="MIT">MIT</option>
                <option value="Apache-2.0">Apache 2.0</option>
                <option value="ISC">ISC</option>
                <option value="BSD-3-Clause">BSD 3-Clause</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">NPM Dependencies</label>
            <input
              type="text"
              value={deps}
              onChange={(e) => setDeps(e.target.value)}
              placeholder="framer-motion, lucide-react, clsx (comma separated)"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !description.trim()}
            className="w-full py-3 mt-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
            {loading ? "Creating..." : "Continue to Upload"}
          </button>
        </form>
      )}

      {/* Step 2: File upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground">TSX, CSS, tailwind config — max 500KB per file</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".tsx,.ts,.css,.json"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg">
                  <span className="font-mono text-sm text-foreground">{f.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="w-3 h-3" /> Add more files
              </button>
            </div>
          )}

          <button
            onClick={handleUploadFiles}
            disabled={loading || files.length === 0}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? "Uploading..." : "Submit for Review"}
          </button>
        </div>
      )}
    </div>
  );
}

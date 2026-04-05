"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";

// ═══════════════════════════════════════════════════
// ENTRY FORM — Create / edit a design entry
// Uploads image via presigned URL, saves entry via API.
// ═══════════════════════════════════════════════════

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
}

interface EntryFormProps {
  categoryId: string;
  initialData?: DesignEntry | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EntryForm({ categoryId, initialData, onSuccess, onCancel }: EntryFormProps) {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setImageUrl(initialData.image_url);
      setImageKey(initialData.image_key ?? "");
      setPrompt(initialData.prompt);
      setCode(initialData.code);
    } else {
      setTitle("");
      setImageUrl("");
      setImageKey("");
      setPrompt("");
      setCode("");
    }
  }, [initialData]);

  // ─── Image upload (presign → direct upload) ─────
  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      // Get presigned URL
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: categoryId, // re-use the presign endpoint with category as container
          fileType: "image",
          contentType: file.type,
          sizeBytes: file.size,
          filename: file.name,
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { data } = await presignRes.json();

      // Upload to R2/S3
      await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Set the CDN URL
      const cdnUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ""}/${data.r2Key}`;
      setImageUrl(cdnUrl);
      setImageKey(data.r2Key);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Submit form ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !prompt.trim() || !code.trim()) {
      alert("Please fill in all required fields: Title, Prompt, Code");
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditing = !!initialData;
      const url = isEditing ? `/api/admin/entries/${initialData.id}` : "/api/admin/entries";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title: title.trim(),
          imageUrl,
          imageKey,
          prompt,
          code,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      // Clear form on create, keep on update
      if (!isEditing) {
        setTitle("");
        setImageUrl("");
        setImageKey("");
        setPrompt("");
        setCode("");
      }

      onSuccess?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Drag & drop handler ────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadImage(file);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">
          {initialData ? "Edit Entry" : "New Entry"}
        </h2>
        {initialData && onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel Edit
          </button>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Dark Minimalist Navbar"
          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Preview Image</label>
        <div
          className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Drag & drop an image or click to browse</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
          }}
        />
        {imageUrl && (
          <div className="mt-3 overflow-hidden rounded-lg border border-border relative h-44">
            <Image src={imageUrl} alt="Preview" fill className="object-cover" />
          </div>
        )}
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Prompt / Description *</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the design or include the AI prompt used..."
          rows={4}
          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      {/* Code */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Code *</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste TSX / React code here..."
          rows={10}
          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSubmitting ? "Saving..." : initialData ? "Update Entry" : "Save Entry"}
      </button>
    </form>
  );
}

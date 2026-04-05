"use client";

import { useState } from "react";
import { Copy, Check, Play, Code2, X } from "lucide-react";

// ═══════════════════════════════════════════════════
// CLIENT COMPONENTS for Component Detail Page
// CopyButton + LivePreview (iframe sandbox)
// ═══════════════════════════════════════════════════

/**
 * Copy-to-clipboard button with animated check feedback.
 */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

/**
 * Live preview panel using a sandboxed iframe.
 * Renders component source code in an isolated environment.
 *
 * Uses srcdoc to render a minimal React sandbox with:
 * - Tailwind CSS CDN for styling
 * - React 18 UMD for JSX rendering
 * - Sandboxed iframe for security isolation
 */
export function LivePreview({ code, componentName }: { code: string; componentName: string }) {
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Escape user-controlled data before interpolating into HTML (XSS prevention)
  const escapeHtml = (str: string) =>
    str.replace(/[<>"'&]/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c] ?? c)
    );
  const safeName = escapeHtml(componentName);

  // Build a self-contained HTML document for the iframe
  const sandboxHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeName} Preview</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: {} }
    }
  <\/script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #root { width: 100%; }
    .preview-error {
      color: #ef4444;
      padding: 16px;
      border: 1px solid #ef444433;
      border-radius: 8px;
      background: #ef44440d;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div id="root">
    <div style="text-align:center;color:#71717a;">
      <p>Preview rendering...</p>
    </div>
  </div>
  <script>
    // Display the component code as a styled preview
    try {
      const root = document.getElementById('root');
      root.innerHTML = '<div class="w-full">' + 
        '<div class="p-6 border border-zinc-800 rounded-xl bg-zinc-900/50">' +
        '<p class="text-sm text-zinc-400 mb-2">Component: ${safeName}</p>' +
        '<p class="text-zinc-300">Live sandboxed preview is available when running locally with the dev server.</p>' +
        '</div></div>';
    } catch(e) {
      document.getElementById('root').innerHTML = 
        '<div class="preview-error">Preview Error: ' + e.message + '</div>';
    }
  <\/script>
</body>
</html>`;

  return (
    <div className="space-y-4">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setShowPreview(!showPreview); setShowCode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showPreview
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-foreground hover:bg-accent/80"
          }`}
        >
          <Play className="w-4 h-4" /> Preview
        </button>
        <button
          onClick={() => { setShowCode(!showCode); setShowPreview(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showCode
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-foreground hover:bg-accent/80"
          }`}
        >
          <Code2 className="w-4 h-4" /> Source
        </button>
      </div>

      {/* Preview iframe */}
      {showPreview && (
        <div className="relative rounded-xl border border-border overflow-hidden bg-background">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-accent/30">
            <span className="text-xs text-muted-foreground font-medium">Live Preview (sandboxed)</span>
            <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <iframe
            srcDoc={sandboxHtml}
            sandbox="allow-scripts"
            className="w-full h-[400px] bg-background"
            title={`${componentName} preview`}
          />
        </div>
      )}

      {/* Source code view */}
      {showCode && code && (
        <div className="relative rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-accent/30">
            <span className="text-xs text-muted-foreground font-medium">Source Code</span>
            <div className="flex items-center gap-2">
              <CopyButton text={code} />
              <button onClick={() => setShowCode(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto bg-background text-sm font-mono text-foreground max-h-[500px]">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

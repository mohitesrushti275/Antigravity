"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Bot, Code2, Copy, Check } from "lucide-react";

// ═══════════════════════════════════════════════════
// MAGIC CHAT — AI Component Generation
// Streams SSE from /api/magic/generate
// ═══════════════════════════════════════════════════

type Message = {
  role: "user" | "agent";
  content: string;
};

function MagicChatContent() {
  const searchParams = useSearchParams();
  const predefinedPrompt = searchParams.get("prompt");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: "Hi! I'm your Magic Chat assistant, powered by the 21st Agents SDK. What kind of UI component can I build for you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (predefinedPrompt) setInput(predefinedPrompt);
  }, [predefinedPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    const updated: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages([...updated, { role: "agent", content: "" }]);

    try {
      const res = await fetch("/api/magic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          framework: "next",
          projectDeps: ["tailwindcss", "lucide-react", "framer-motion"],
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamed = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE events from Anthropic
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content_block_delta" && data.delta?.text) {
                streamed += data.delta.text;
              }
            } catch {
              // Non-JSON data — raw text stream (stub mode)
              streamed += line.slice(6);
            }
          }
        }

        setMessages([...updated, { role: "agent", content: streamed }]);
      }

      // If no SSE parsing worked, treat entire response as text
      if (!streamed) {
        const text = decoder.decode();
        setMessages([...updated, { role: "agent", content: text || "Generation complete." }]);
      }
    } catch {
      setMessages([...updated, { role: "agent", content: "An error occurred while generating. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const lastAgentMsg = [...messages].reverse().find((m) => m.role === "agent" && m.content.length > 100);

  const handleCopy = () => {
    if (lastAgentMsg) {
      navigator.clipboard.writeText(lastAgentMsg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="p-6 border-b border-border bg-background flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary" /> Magic Chat
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Describe what you need, and I&apos;ll generate a production-ready component.
          </p>
        </div>
        {lastAgentMsg && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Last"}
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto w-full p-6 space-y-6 flex flex-col">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 max-w-4xl ${msg.role === "user" ? "self-end bg-accent/30 rounded-2xl p-4" : "self-start"}`}>
            {msg.role === "agent" && (
              <div className="w-8 h-8 rounded shrink-0 bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 pt-1">
              {msg.role === "user" ? (
                <p className="text-foreground">{msg.content}</p>
              ) : (
                <div className="prose prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-4 max-w-4xl self-start">
            <div className="w-8 h-8 rounded shrink-0 bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-3 flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="E.g., A minimalist pricing card with a toggle for annual billing..."
            className="w-full bg-accent/20 border border-border rounded-xl pl-4 pr-12 py-4 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 text-foreground"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MagicChat() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground animate-pulse">Loading Magic Chat...</div>}>
      <MagicChatContent />
    </Suspense>
  );
}

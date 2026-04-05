import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { errors } from '@/lib/api/response';
import { writeAuditLog } from '@/lib/audit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildSystemPrompt } from '@/lib/magic/prompt';
import { searchRegistry } from '@/lib/magic/search';
import { GenerateSchema } from '@21st/types';
import { auth } from '@clerk/nextjs/server';

// ═══════════════════════════════════════════════════
// POST /api/magic/generate — AI component generation
// ═══════════════════════════════════════════════════
export const POST = withHandler(async (req: NextRequest) => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return errors.unauthorized();

  const body = await req.json();
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) return errors.validationError(parsed.error.flatten());

  const { prompt, currentFile, projectDeps, framework, tailwindConfig } = parsed.data;

  // Get internal user
  const { data: user } = await supabaseAdmin
    .from('users').select('id').eq('clerk_id', clerkId).single();
  if (!user) return errors.unauthorized();

  // Search registry for context (RAG)
  const registryResults = await searchRegistry(prompt, 3);

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt({
    framework,
    projectDeps,
    tailwindConfig,
    registryContext: registryResults.length
      ? { components: registryResults }
      : undefined,
  });

  // Build user message
  let userMessage = prompt;
  if (currentFile) {
    userMessage += `\n\nCurrent file context:\n\`\`\`tsx\n${currentFile}\n\`\`\``;
  }

  // Check if Anthropic API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Stub mode — return a placeholder component
    const stubComponent = generateStubComponent(prompt);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(stubComponent));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Stream from Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 8000,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    console.error('Anthropic API error:', response.status, await response.text());
    return errors.internal();
  }

  // Forward the SSE stream
  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  // Read and forward in background
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      await writer.close();
    }
  })();

  // Audit log (fire and forget)
  writeAuditLog({
    userId: user.id,
    action: 'magic.generate',
    resourceType: 'component',
    metadata: { prompt: prompt.slice(0, 200), framework },
  });

  return new Response(transformStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

/**
 * Generate a stub component when Anthropic API key is not configured.
 * Returns a working TSX component that serves as a placeholder.
 */
function generateStubComponent(prompt: string): string {
  return `"use client";

import React from "react";

export default function GeneratedComponent() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          AI Generated (Stub Mode)
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          ${prompt.replace(/'/g, "\\'")}
        </h2>
        <p className="text-muted-foreground max-w-md">
          This is a placeholder component. Connect your Anthropic API key to generate real components.
        </p>
      </div>
    </div>
  );
}
`;
}

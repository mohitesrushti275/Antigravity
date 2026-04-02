# Architecture Overview

## High-Level Architecture
1. **Frontend App**: Built with Next.js (App Router), focusing on SSR, dynamic routing, and dark-themed Tailwind or Vanilla CSS aesthetics.
2. **Backend Services**: Next.js API Routes / standalone Python server to handle LLM executions and SDK operations.
3. **Agent execution environment**: Secure sandbox utilizing the 21st Agents SDK, supporting Claude and OpenAI.

## Component Flow
1. User browses to the marketplace and selects a template (e.g., Next.js Agent Starter).
2. Frontend requests agent configuration via API.
3. The server spins up an execution context using the Agents SDK.
4. "Magic Chat" interactions stream real-time UI component generation directly to the client view via WebSockets/SSE.

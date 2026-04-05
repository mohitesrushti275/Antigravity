# 21st.dev — Full Backend Architecture Specification

> **Version:** 1.0  
> **Stack:** Next.js 14 · TypeScript · Supabase (Postgres + pgvector + RLS) · Cloudflare R2 · Clerk · Upstash Redis · Anthropic Claude API  
> **Pattern:** Modular monolith on Vercel Edge + serverless functions · Event-driven background jobs · Defence-in-depth security  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [DFD Level 0 — System Context](#3-dfd-level-0--system-context)
4. [DFD Level 1 — Internal Process Decomposition](#4-dfd-level-1--internal-process-decomposition)
5. [DFD Level 2 — AI Orchestration Subprocess](#5-dfd-level-2--ai-orchestration-subprocess)
6. [Component Publish — Sequence Diagram](#6-component-publish--sequence-diagram)
7. [Admin Review — State Machine](#7-admin-review--state-machine)
8. [Security Architecture — 7-Layer Defence in Depth](#8-security-architecture--7-layer-defence-in-depth)
9. [Database Schema — Full SQL](#9-database-schema--full-sql)
10. [Entity Relationship Diagram](#10-entity-relationship-diagram)
11. [Row-Level Security Policies](#11-row-level-security-policies)
12. [API Routes — Full Reference](#12-api-routes--full-reference)
13. [Next.js Middleware Stack](#13-nextjs-middleware-stack)
14. [AI Orchestration — Prompt Pipeline](#14-ai-orchestration--prompt-pipeline)
15. [File Upload Architecture](#15-file-upload-architecture)
16. [Caching Strategy](#16-caching-strategy)
17. [Background Jobs](#17-background-jobs)
18. [Error Handling Standard](#18-error-handling-standard)
19. [Observability & Monitoring](#19-observability--monitoring)
20. [Project Structure](#20-project-structure)
21. [Environment Variables](#21-environment-variables)
22. [CI/CD Pipeline](#22-cicd-pipeline)
23. [Industry Practices Applied](#23-industry-practices-applied)

---

## 1. System Overview

21st.dev is a community-driven React UI component registry — described as "npm for design engineers." It provides:

- **Component marketplace** — browse, publish, preview, and install shadcn/ui-based React components
- **Live sandboxed preview** — every component renders interactively in a Sandpack iframe
- **AI generation (Magic MCP)** — natural-language prompt → Claude API → streamed TSX directly into the developer's IDE
- **CLI installation** — `npx shadcn@latest add "https://21st.dev/r/username/slug"` installs with full dependency resolution
- **Admin review pipeline** — human-in-the-loop moderation before public listing

### External actors

| Actor | Role |
|-------|------|
| Browser client | Next.js SSR/CSR app consuming the REST API |
| AI IDE | Cursor / Windsurf / VS Code + Cline consuming the MCP server |
| Clerk | Identity provider — JWT issuance, webhook events |
| Anthropic API | Claude for component generation and enhancement |
| Cloudflare R2 | Object store for TSX files, images, videos |
| Supabase | Postgres database + auth helpers + realtime |
| Upstash Redis | Rate limiting + usage counters + short-lived cache |
| Vercel | Hosting, edge middleware, cron jobs |
| Resend | Transactional email (review notifications) |

---

## 2. Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Stateless API** | No in-memory session state — JWT + DB for all state |
| **Defence in depth** | 7 security layers — each independent, all required |
| **Owner-based access** | Every write checks `user_id = auth.uid()` at API AND DB layer |
| **Idempotent mutations** | Like toggle, upload confirm, key creation all safe to retry |
| **Additive migrations** | No column drops/renames in single deploy — always expand-contract |
| **Observable by default** | Structured logs + traceId on every request |
| **Background for heavy work** | File scan, count recompute, embedding generation — all async workers |
| **Edge-first** | Auth middleware and rate limiting run on Vercel Edge (no cold start) |

---

## 3. DFD Level 0 — System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL ENTITIES                                │
│                                                                             │
│   [Browser Client]          [AI IDE]          [Admin User]                 │
│   Next.js app               Cursor/Windsurf   Internal dashboard           │
└──────────┬──────────────────────┬─────────────────────┬───────────────────┘
           │ REST/GraphQL          │ MCP / npx            │ REST + role claim
           │ JSON responses        │ SSE stream           │
           ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         21st.dev PLATFORM                                   │
│               Next.js 14 API routes + Edge middleware                       │
│               Vercel serverless functions + cron workers                    │
└──────┬──────────────┬───────────────┬──────────────────┬───────────────────┘
       │              │               │                  │
       ▼              ▼               ▼                  ▼
  [Supabase]    [Cloudflare R2]  [Clerk Auth]      [Anthropic]
  Postgres DB   File storage     JWT + webhooks     Claude API
  pgvector      TSX/img/video    User identity      AI generation
  RLS           CDN delivery     Webhook events     SSE stream
       │
       ▼
  [Upstash Redis]
  Rate limiting
  Usage counters
  Response cache
```

### Data flows (Level 0)

| Flow | Source → Dest | Data |
|------|--------------|------|
| Component browse | Browser → Platform → Supabase | Query params → JSON list |
| Component install | IDE → Platform → R2 → IDE | slug → presigned URL → TSX content |
| AI generation | IDE → Platform → Anthropic → IDE | Prompt → SSE token stream |
| Auth sync | Clerk → Platform → Supabase | Webhook → user upsert |
| File upload | Browser → Platform → R2 | Presign request → PUT URL → file bytes |
| Admin review | Admin → Platform → Supabase | Action → status transition |

---

## 4. DFD Level 1 — Internal Process Decomposition

```
 Incoming request
        │
        ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  P1 Auth      │───▶│  P2 Rate      │───▶│  P3 Router    │
│  middleware   │    │  limiter      │    │  Next.js API  │
│  JWT/API key  │    │  Redis bucket │    │  route match  │
└───────────────┘    └───────────────┘    └───────┬───────┘
                                                  │
              ┌───────────────────────────────────┼──────────────────────┐
              │                                   │                      │
              ▼                                   ▼                      ▼
   ┌──────────────────┐              ┌────────────────────┐   ┌──────────────────┐
   │ P4 Component     │              │ P5 File manager    │   │ P6 Search        │
   │ CRUD service     │              │ R2 presign/confirm │   │ pgvector + FTS   │
   │ Zod validated    │              │ MIME + size guard  │   │ Ranked results   │
   └────────┬─────────┘              └────────┬───────────┘   └────────┬─────────┘
            │                                 │                        │
            ├─────────────────────────────────┤                        │
            ▼                                 ▼                        ▼
   ┌──────────────────┐              ┌────────────────────┐   ┌──────────────────┐
   │ P7 AI            │              │ P8 Admin review    │   │ P9 Event bus     │
   │ orchestrator     │              │ State machine      │   │ Audit + notify   │
   │ Prompt + Claude  │              │ on_review→posted   │   │ Resend email     │
   └────────┬─────────┘              └────────┬───────────┘   └────────┬─────────┘
            │                                 │                        │
            ▼                                 ▼                        ▼
   ╔══════════════╗                  ╔════════════════╗       ╔══════════════════╗
   ║ DS1          ║                  ║ DS2            ║       ║ DS3              ║
   ║ components   ║                  ║ R2 files       ║       ║ audit_log        ║
   ║ (Supabase)   ║                  ║ (Cloudflare)   ║       ║ (Supabase)       ║
   ╚══════════════╝                  ╚════════════════╝       ╚══════════════════╝
```

### Process descriptions

| Process | Responsibility | Technology |
|---------|---------------|-----------|
| P1 Auth middleware | Validate Clerk JWT or SHA-256 API key; inject user context | Clerk SDK + Supabase admin |
| P2 Rate limiter | Sliding-window counters per identity + route tier | Upstash Redis `@upstash/ratelimit` |
| P3 Router | Match path + method to handler, pass context | Next.js App Router `route.ts` |
| P4 Component CRUD | Business logic for create/read/update/delete components | Supabase JS client |
| P5 File manager | Issue presigned R2 URLs, confirm uploads, validate files | Cloudflare R2 SDK |
| P6 Search | Hybrid: pgvector cosine + Postgres `tsvector` FTS | Supabase RPC + pgvector |
| P7 AI orchestrator | Build context-aware prompt, call Claude, stream response | Anthropic SDK |
| P8 Admin review | Enforce valid status transitions, send notifications | State machine + Resend |
| P9 Event bus | Write audit_log, trigger side effects (cache invalidation) | Supabase insert + Vercel function |

---

## 5. DFD Level 2 — AI Orchestration Subprocess

```
POST /api/magic/generate
        │
        ▼
┌───────────────────┐
│ 2.1 API key auth  │
│ SHA-256 lookup    │──── invalid ──▶ 401 Unauthorized
│ revoked_at check  │
└────────┬──────────┘
         │ valid
         ▼
┌───────────────────┐
│ 2.2 Usage check   │
│ monthly_count vs  │──── exceeded ─▶ 429 Limit Reached
│ tier cap (Redis)  │                 { upgrade_url }
└────────┬──────────┘
         │ under limit
         ▼
┌───────────────────┐
│ 2.3 Request parse │
│ prompt            │
│ currentFile       │
│ projectDeps[]     │
│ framework         │
│ tailwindConfig    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐         ┌──────────────────────────┐
│ 2.4 Vector search │────────▶│ Supabase pgvector         │
│ Embed prompt with │◀────────│ cosine similarity on      │
│ text-embedding-3  │ top 3   │ description_embedding     │
└────────┬──────────┘ matches └──────────────────────────┘
         │
         ▼
┌───────────────────┐         ┌──────────────────────────┐
│ 2.5 Source fetch  │────────▶│ Cloudflare R2             │
│ GET matched TSX   │◀────────│ presigned GET URL         │
│ files from R2     │ content └──────────────────────────┘
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2.6 Prompt build  │
│ System: rules +   │
│ registry context  │
│ + project deps    │
│ User: prompt text │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐         ┌──────────────────────────┐
│ 2.7 Claude call   │────────▶│ Anthropic API             │
│ claude-sonnet-4-5 │         │ model: claude-sonnet-4-5  │
│ temp: 0.3         │◀────────│ stream: true              │
│ max_tokens: 4096  │ SSE     │ max_tokens: 4096          │
└────────┬──────────┘ stream  └──────────────────────────┘
         │
         ▼
┌───────────────────┐
│ 2.8 Post-process  │
│ Strip MD fences   │──── invalid ──▶ Retry once with
│ Validate TSX      │                 corrective prompt
│ Check first line  │
└────────┬──────────┘
         │ valid TSX
         ▼
┌───────────────────┐         ┌──────────────────────────┐
│ 2.9 Accounting    │────────▶│ Redis: monthly_count++    │
│ Increment counter │         │ Supabase: audit_log write │
│ Log to audit_log  │         └──────────────────────────┘
└────────┬──────────┘
         │
         ▼
    SSE stream
    to IDE buffer
```

---

## 6. Component Publish — Sequence Diagram

```
Client              API Server            Cloudflare R2         Supabase            Worker
  │                     │                       │                   │                  │
  │ POST /api/components│                       │                   │                  │
  │ { name, desc,       │                       │                   │                  │
  │   category, tags }  │                       │                   │                  │
  │────────────────────▶│                       │                   │                  │
  │                     │ validate JWT          │                   │                  │
  │                     │ validate Zod schema   │                   │                  │
  │                     │──────────────────────────────────────────▶│                  │
  │                     │ INSERT components     │                   │                  │
  │                     │ status = draft        │                   │                  │
  │                     │◀──────────────────────────────────────────│                  │
  │◀────────────────────│                       │                   │                  │
  │ { id,               │                       │                   │                  │
  │   uploadUrls: {     │                       │                   │                  │
  │     componentUrl,   │                       │                   │                  │
  │     demoUrl,        │                       │                   │                  │
  │     cssUrl } }      │                       │                   │                  │
  │                     │                       │                   │                  │
  │ PUT [componentUrl]  │                       │                   │                  │
  │ (TSX bytes direct)  │                       │                   │                  │
  │────────────────────────────────────────────▶│                   │                  │
  │                     │                       │ stored            │                  │
  │ PUT [demoUrl]       │                       │                   │                  │
  │────────────────────────────────────────────▶│                   │                  │
  │ PUT [cssUrl]        │                       │                   │                  │
  │────────────────────────────────────────────▶│                   │                  │
  │                     │                       │                   │                  │
  │ POST /api/upload/confirm                    │                   │                  │
  │ { componentId, fileKeys[] }                 │                   │                  │
  │────────────────────▶│                       │                   │                  │
  │                     │──────────────────────────────────────────▶│                  │
  │                     │ INSERT component_files │                  │                  │
  │                     │ UPDATE components      │                  │                  │
  │                     │ status = on_review     │                  │                  │
  │                     │◀──────────────────────────────────────────│                  │
  │                     │ enqueue malware_scan ──────────────────────────────────────▶│
  │◀────────────────────│                       │                   │                  │
  │ { status: on_review}│                       │                   │                  │
  │                     │                       │                   │                  │
  │                     │                       │                   │             GET file content
  │                     │                       │◀───────────────────────────────────│
  │                     │                       │ TSX bytes ────────────────────────▶│
  │                     │                       │                   │            static analysis
  │                     │                       │                   │            (eval, child_process,
  │                     │                       │                   │             remote scripts)
  │                     │                       │                   │◀───────────────│
  │                     │                       │              UPDATE status         │
  │                     │                       │              (keep on_review       │
  │                     │                       │               or → rejected)       │
  │                     │                       │              INSERT audit_log      │
  │                     │                       │                   │                  │
  │                     │                       │           ── Admin reviews ──      │
  │                     │ POST /api/admin/review/:id                │                  │
  │                     │ { action: "approve" } │                   │                  │
  │                     │──────────────────────────────────────────▶│                  │
  │                     │                       │              UPDATE status=posted  │
  │                     │                       │              INSERT audit_log      │
  │                     │                       │              invalidate cache      │
  │                     │                       │              send Resend email     │
```

---

## 7. Admin Review — State Machine

```
                    ┌─────────────────────────────────────────────┐
                    │           COMPONENT STATUS MACHINE           │
                    └─────────────────────────────────────────────┘

         user creates
              │
              ▼
         ┌─────────┐
         │  draft  │ ◀──────────────────────────────────┐
         └────┬────┘                                    │
              │ POST /api/upload/confirm                 │
              ▼                                         │
        ┌───────────┐    author revises                 │
        │ on_review │ ◀──────────────────────┐          │
        └─────┬─────┘                        │          │
        admin │                              │          │
        action│                              │          │
     ┌────────┴────────┐                     │          │
     │                 │                     │          │
     ▼                 ▼                     │          │
  ┌──────┐        ┌──────────┐               │          │
  │posted│        │ rejected │ ──────────────┘          │
  └──┬───┘        └──────────┘                          │
     │                                                   │
     │ admin features        admin un-features           │
     ▼                              │                    │
  ┌──────────┐                      │                    │
  │ featured │ ─────────────────────┘                    │
  └─────┬────┘                                           │
        │                          author/admin deletes  │
        │ ──────────────────────────────────────────────▶│
        │                                                │
        ▼                                                ▼
    ┌─────────┐                                    ┌─────────┐
    │ deleted │                                    │ deleted │
    └─────────┘                                    └─────────┘

Valid transitions:
  draft       → on_review   (upload confirm)
  on_review   → posted      (admin approve)
  on_review   → rejected    (admin reject)
  rejected    → on_review   (author resubmit)
  posted      → featured    (admin feature)
  posted      → on_review   (author edit)
  featured    → posted      (admin un-feature)
  posted      → deleted     (author or admin)
  featured    → deleted     (admin)
```

---

## 8. Security Architecture — 7-Layer Defence in Depth

```
 ════════════════════════════════════════════════════════════════
  INCOMING REQUEST
 ════════════════════════════════════════════════════════════════
                          │
                          ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L1  EDGE — Cloudflare WAF + DDoS                            │
 │  • OWASP Core Rule Set v3.3                                   │
 │  • IP-based rate limiting (1000 req/10min)                   │
 │  • Bot score threshold (< 30 blocked)                        │
 │  • Geo-blocking (configurable per route)                     │
 │  • SQL injection + XSS pattern detection                     │
 └─────────────────────────────┬────────────────────────────────┘
                               │ pass
                               ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L2  TRANSPORT + HEADERS                                      │
 │  • TLS 1.3 only (1.2 disabled)                               │
 │  • HSTS: max-age=31536000; includeSubDomains; preload        │
 │  • CORS allowlist: ['https://21st.dev', 'localhost:3000']    │
 │  • Content-Security-Policy: default-src 'self'; ...          │
 │  • X-Frame-Options: DENY                                     │
 │  • X-Content-Type-Options: nosniff                           │
 │  • Referrer-Policy: strict-origin-when-cross-origin          │
 └─────────────────────────────┬────────────────────────────────┘
                               │ pass
                               ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L3  AUTHENTICATION                                           │
 │  Browser:    Clerk RS256 JWT (1h TTL, Clerk manages refresh) │
 │  Magic MCP:  32-byte random API key → SHA-256(key) stored    │
 │  Webhooks:   SVIX signature on X-Svix-Signature header       │
 │  Admin CLI:  Service-role key (server-only, never in client) │
 └─────────────────────────────┬────────────────────────────────┘
                               │ valid identity
                               ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L4  AUTHORISATION — RBAC + OWNERSHIP                        │
 │  • role field in JWT custom claims: 'user' | 'admin'         │
 │  • Every write: assert user_id === resource.user_id (API)    │
 │  • Supabase RLS repeats same check at DB layer               │
 │  • Admin routes: middleware checks role === 'admin'          │
 │  • Scope check on API keys: 'magic' cannot hit admin routes  │
 └─────────────────────────────┬────────────────────────────────┘
                               │ authorised
                               ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L5  INPUT VALIDATION + RATE LIMITING                        │
 │  • Zod schema on every request body (strict mode)            │
 │  • Rate limits (Upstash Redis sliding window):               │
 │      Public IP:       100 req / 1 min                        │
 │      Auth user:        60 req / 1 min                        │
 │      Magic API key:    10 req / 1 min                        │
 │      Admin routes:     30 req / 1 min                        │
 │  • File upload: MIME allowlist + hard size caps              │
 │      TSX: text/plain ≤ 500 KB                                │
 │      Images: image/png|webp ≤ 5 MB                           │
 │      Video: video/mp4 ≤ 50 MB                                │
 └─────────────────────────────┬────────────────────────────────┘
                               │ valid + within limits
                               ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L6  DATA LAYER — SUPABASE RLS                               │
 │  • RLS enabled on every table (default deny)                 │
 │  • Policies enforce ownership at DB row level                │
 │  • No raw SQL strings — parameterised queries only           │
 │  • Secrets in Vercel env vars, never in codebase             │
 │  • Service-role key used only in server-side workers         │
 │  • pgaudit extension logs all DDL + DML (optional)           │
 └─────────────────────────────┬────────────────────────────────┘
                               │ authorised at DB layer
                               ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  L7  AUDIT + OBSERVABILITY                                   │
 │  • Every state-changing operation writes to audit_log        │
 │  • Structured JSON logs with traceId on every request        │
 │  • Sentry: unhandled exceptions + source maps                │
 │  • Alerts: 5xx rate > 1%, auth failures > 50/min            │
 │  • Amplitude: product event tracking                         │
 │  • Logtail/Axiom: log aggregation + search                   │
 └─────────────────────────────┬────────────────────────────────┘
                               │
                          Request served
 ════════════════════════════════════════════════════════════════
```

---

## 9. Database Schema — Full SQL

```sql
-- ══════════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query performance

-- ══════════════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════════════
CREATE TABLE users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     TEXT        NOT NULL UNIQUE,
  username     TEXT        NOT NULL UNIQUE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'user'
                           CHECK (role IN ('user', 'admin')),
  avatar_url   TEXT,
  bio          TEXT        DEFAULT '',
  github_url   TEXT,
  twitter_url  TEXT,
  website_url  TEXT,
  features     JSONB       NOT NULL DEFAULT '{}', -- feature flags per user
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id  ON users (clerk_id);
CREATE INDEX idx_users_username  ON users (username);
CREATE INDEX idx_users_role      ON users (role);

-- ══════════════════════════════════════════════════
-- CATEGORIES
-- ══════════════════════════════════════════════════
CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  section          TEXT NOT NULL
                   CHECK (section IN ('marketing', 'ui', 'screens', 'themes')),
  display_order    INT  NOT NULL DEFAULT 0,
  component_count  INT  NOT NULL DEFAULT 0,     -- denormalised, updated by trigger
  is_active        BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO categories (slug, name, section, display_order) VALUES
  ('hero',              'Heroes',            'marketing', 1),
  ('features',          'Features',          'marketing', 2),
  ('call-to-action',    'Calls to Action',   'marketing', 3),
  ('pricing-section',   'Pricing Sections',  'marketing', 4),
  ('testimonials',      'Testimonials',      'marketing', 5),
  ('navbar-navigation', 'Navigation Menus',  'marketing', 6),
  ('footer',            'Footers',           'marketing', 7),
  ('button',            'Buttons',           'ui',        1),
  ('card',              'Cards',             'ui',        2),
  ('input',             'Inputs',            'ui',        3),
  ('modal-dialog',      'Dialogs / Modals',  'ui',        4),
  ('table',             'Tables',            'ui',        5),
  ('ai-chat',           'AI Chats',          'ui',        6);

-- ══════════════════════════════════════════════════
-- COMPONENTS
-- ══════════════════════════════════════════════════
CREATE TABLE components (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id           UUID        REFERENCES categories (id) ON DELETE SET NULL,

  -- Identity
  slug                  TEXT        NOT NULL,
  name                  TEXT        NOT NULL,
  description           TEXT        NOT NULL DEFAULT '',

  -- AI search
  description_embedding VECTOR(1536),           -- text-embedding-3-small (OpenAI/Supabase)

  -- Lifecycle
  status                TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'on_review', 'posted', 'featured', 'rejected', 'deleted'
                        )),
  rejection_reason      TEXT,

  -- Counts (denormalised for query speed)
  download_count        INT         NOT NULL DEFAULT 0,
  like_count            INT         NOT NULL DEFAULT 0,

  -- Meta
  npm_dependencies      JSONB       NOT NULL DEFAULT '[]',
  license               TEXT        NOT NULL DEFAULT 'MIT',
  is_public             BOOLEAN     NOT NULL DEFAULT true,
  registry_version      INT         NOT NULL DEFAULT 1,     -- for shadcn registry schema

  -- Timestamps
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, slug)
);

-- Indexes
CREATE INDEX idx_components_status     ON components (status);
CREATE INDEX idx_components_user_id    ON components (user_id);
CREATE INDEX idx_components_category   ON components (category_id);
CREATE INDEX idx_components_published  ON components (published_at DESC)
             WHERE status IN ('posted', 'featured');
CREATE INDEX idx_components_popular    ON components (download_count DESC)
             WHERE status IN ('posted', 'featured');

-- Full-text search index
CREATE INDEX idx_components_fts ON components
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Vector similarity index (IVFFlat — tune lists to sqrt(row_count))
CREATE INDEX idx_components_embedding ON components
  USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════
-- COMPONENT DEMOS
-- ══════════════════════════════════════════════════
CREATE TABLE component_demos (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id       UUID    NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  name               TEXT    NOT NULL DEFAULT 'default',
  preview_image_key  TEXT,                         -- R2 object key
  video_key          TEXT,                         -- R2 object key
  display_order      INT     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_component_demos_component ON component_demos (component_id);

-- ══════════════════════════════════════════════════
-- COMPONENT FILES
-- ══════════════════════════════════════════════════
CREATE TABLE component_files (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id  UUID    NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  demo_id       UUID    REFERENCES component_demos (id) ON DELETE SET NULL,
  file_type     TEXT    NOT NULL
                CHECK (file_type IN ('component', 'demo', 'css', 'config', 'tailwind')),
  r2_key        TEXT    NOT NULL UNIQUE,
  filename      TEXT    NOT NULL,
  size_bytes    INT     NOT NULL DEFAULT 0,
  content_type  TEXT    NOT NULL DEFAULT 'text/plain',
  checksum      TEXT,                               -- SHA-256 of file content
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_component_files_component ON component_files (component_id);

-- ══════════════════════════════════════════════════
-- TAGS
-- ══════════════════════════════════════════════════
CREATE TABLE tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

CREATE TABLE component_tags (
  component_id  UUID NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (component_id, tag_id)
);

CREATE INDEX idx_component_tags_tag ON component_tags (tag_id);

-- ══════════════════════════════════════════════════
-- LIKES
-- ══════════════════════════════════════════════════
CREATE TABLE likes (
  user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  component_id  UUID        NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, component_id)
);

CREATE INDEX idx_likes_component ON likes (component_id);

-- Trigger to keep like_count in sync
CREATE OR REPLACE FUNCTION sync_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE components SET like_count = like_count + 1 WHERE id = NEW.component_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE components SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.component_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION sync_like_count();

-- ══════════════════════════════════════════════════
-- DOWNLOADS
-- ══════════════════════════════════════════════════
CREATE TABLE downloads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id    UUID        NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES users (id) ON DELETE SET NULL,
  ip_hash         TEXT,                            -- SHA-256(ip) for privacy
  install_method  TEXT        CHECK (install_method IN ('cli', 'copy', 'mcp', 'api')),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_downloads_component   ON downloads (component_id, created_at DESC);
CREATE INDEX idx_downloads_created_at  ON downloads (created_at DESC);

-- ══════════════════════════════════════════════════
-- API KEYS
-- ══════════════════════════════════════════════════
CREATE TABLE api_keys (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key_prefix     TEXT        NOT NULL,              -- first 8 chars shown in UI
  key_hash       TEXT        NOT NULL UNIQUE,       -- SHA-256(full_key)
  name           TEXT        NOT NULL DEFAULT 'default',
  scope          TEXT        NOT NULL DEFAULT 'magic'
                 CHECK (scope IN ('magic', 'registry', 'admin')),
  monthly_limit  INT         NOT NULL DEFAULT 50,
  monthly_count  INT         NOT NULL DEFAULT 0,
  month_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  last_used_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user    ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash    ON api_keys (key_hash);

-- ══════════════════════════════════════════════════
-- AUDIT LOG
-- ══════════════════════════════════════════════════
CREATE TABLE audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES users (id) ON DELETE SET NULL,
  action         TEXT        NOT NULL,  -- 'component.created', 'component.reviewed', etc.
  resource_type  TEXT        NOT NULL,  -- 'component', 'user', 'api_key', 'cron'
  resource_id    UUID,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  ip_hash        TEXT,
  trace_id       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user      ON audit_log (user_id);
CREATE INDEX idx_audit_log_action    ON audit_log (action);
CREATE INDEX idx_audit_log_resource  ON audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_log_created   ON audit_log (created_at DESC);

-- Partition by month for large-scale retention (optional, add if > 10M rows)
-- PARTITION BY RANGE (created_at);
```

---

## 10. Entity Relationship Diagram

```
 USERS ─────────────────────────────────────────────────────────────────────
   id (PK)                  ─────────────────────────────────────────────────┐
   clerk_id (UK)                                                              │
   username (UK)                                                              │
   email                                                                      │
   role (user|admin)                                                          │
   bio, avatar_url                                                            │
   github_url, twitter_url                                                    │
   features (JSONB)         ──owns──▶  API_KEYS                             │
   created_at, updated_at              id (PK)                               │
                            ──gives──▶ key_prefix, key_hash (UK)            │
                                       scope, monthly_count                  │
                            ──generates──▶ AUDIT_LOG                         │
                                           id (PK)                           │
                                           action, resource_type             │
                                           metadata (JSONB)                  │
                                                                             │
 CATEGORIES ────────────────────────────────────────────────────────────────│
   id (PK)                                                                   │
   slug (UK), name                                                           │
   section (marketing|ui|screens)                                            │
   display_order                                                             │
   component_count (denorm)                                                  │
                            ──groups──▶                                       │
                                                                              │
 COMPONENTS ◀─────────────────────────────────────────────────────────────── (user_id FK)
   id (PK)                                                                   │
   user_id (FK ──▶ USERS)                                                   │
   category_id (FK ──▶ CATEGORIES)                                          │
   slug, name, description                                                   │
   description_embedding (vector 1536)                                       │
   status (draft|on_review|posted|featured|rejected|deleted)                 │
   download_count, like_count (denorm)                                       │
   npm_dependencies (JSONB)                                                  │
   published_at                                                              │
       │                                                                      │
       ├──has──▶  COMPONENT_DEMOS                                            │
       │            id (PK)                                                   │
       │            component_id (FK)                                         │
       │            name, preview_image_key, video_key                       │
       │            display_order                                             │
       │                │                                                     │
       │                └──contains──▶  COMPONENT_FILES                      │
       │                                 id (PK)                              │
       ├──stores──▶  COMPONENT_FILES     component_id (FK)                   │
       │              id (PK)            demo_id (FK, nullable)               │
       │              component_id (FK)  file_type                            │
       │              demo_id (FK)       r2_key (UK)                          │
       │              file_type          filename, size_bytes                 │
       │              r2_key (UK)                                              │
       │              filename                                                 │
       │                                                                      │
       ├──tagged──▶  COMPONENT_TAGS ──▶  TAGS                                │
       │              component_id (FK)   id (PK)                             │
       │              tag_id (FK)         slug (UK), name                     │
       │                                                                      │
       ├──receives──▶  LIKES                                                  │
       │                user_id (FK ──▶ USERS)                                │
       │                component_id (FK)                                     │
       │                [trigger updates like_count]                          │
       │                                                                      │
       └──tracks──▶  DOWNLOADS                                                │
                      id (PK)                                                 │
                      component_id (FK)                                       │
                      user_id (FK, nullable)                                   │
                      ip_hash, install_method                                 │
```

---

## 11. Row-Level Security Policies

```sql
-- ══════════════════════════════════════════════════
-- COMPONENTS RLS
-- ══════════════════════════════════════════════════
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

-- Public can read posted and featured
CREATE POLICY "public_read_published"
  ON components FOR SELECT
  USING (
    status IN ('posted', 'featured')
    AND is_public = true
  );

-- Owners see all their own components (any status)
CREATE POLICY "owner_read_own"
  ON components FOR SELECT
  USING (user_id = auth.uid());

-- Owners can create
CREATE POLICY "owner_insert"
  ON components FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Owners can update their own; admins can update any
CREATE POLICY "owner_or_admin_update"
  ON components FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Owners soft-delete their own; admins delete any
CREATE POLICY "owner_or_admin_delete"
  ON components FOR DELETE
  USING (
    user_id = auth.uid()
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- ══════════════════════════════════════════════════
-- COMPONENT_FILES RLS
-- ══════════════════════════════════════════════════
ALTER TABLE component_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_files_of_published"
  ON component_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = component_id
        AND c.status IN ('posted', 'featured')
        AND c.is_public = true
    )
  );

CREATE POLICY "owner_or_admin_all_files"
  ON component_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = component_id
        AND (c.user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin')
    )
  );

-- ══════════════════════════════════════════════════
-- LIKES RLS
-- ══════════════════════════════════════════════════
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_likes"
  ON likes FOR SELECT USING (true);

CREATE POLICY "owner_manage_likes"
  ON likes FOR ALL USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════
-- DOWNLOADS RLS
-- ══════════════════════════════════════════════════
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anon logging is intentional)
CREATE POLICY "anyone_insert_download"
  ON downloads FOR INSERT WITH CHECK (true);

-- Only admins can read raw download records
CREATE POLICY "admin_read_downloads"
  ON downloads FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ══════════════════════════════════════════════════
-- API_KEYS RLS
-- ══════════════════════════════════════════════════
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_keys"
  ON api_keys FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admin_read_all_keys"
  ON api_keys FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ══════════════════════════════════════════════════
-- AUDIT_LOG RLS — server-side only via service role
-- ══════════════════════════════════════════════════
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- No user-level direct access (service role bypasses RLS)
CREATE POLICY "deny_all_users"
  ON audit_log FOR ALL USING (false);
```

---

## 12. API Routes — Full Reference

### Auth legend

| Badge | Meaning |
|-------|---------|
| `public` | No auth. IP rate-limited (100 req/min) |
| `JWT` | Clerk bearer token. User rate-limited (60 req/min) |
| `API key` | SHA-256 hashed key. Per-key limit (10 req/min) |
| `admin` | JWT with `role=admin` claim. (30 req/min) |
| `SVIX` | Webhook with SVIX signature header |

### Response envelope (all routes)

```json
// Success
{ "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 340, "has_more": true } }

// Error
{ "error": "Component not found", "code": "NOT_FOUND", "details": { "id": "..." } }
```

---

### Component registry — reads (`public`)

| Method | Route | Response | Notes |
|--------|-------|----------|-------|
| `GET` | `/api/components` | `Component[]` | Query: `?category=`, `?status=`, `?sort=popular\|newest\|trending`, `?q=`, `?page=`, `?limit=` |
| `GET` | `/api/components/popular` | `Component[]` | Top 20, 7-day download window, cached 5 min |
| `GET` | `/api/components/featured` | `Component[]` | Admin-curated, cached 5 min |
| `GET` | `/api/components/:id` | `Component` | Includes demos, tags, author. ETag cached. |
| `GET` | `/api/components/:id/source` | `SourceBundle` | All file contents as `{ component, demo, css, config }` |
| `GET` | `/r/:username/:slug` | `RegistryItem` | shadcn registry format for `npx shadcn@latest add` |
| `GET` | `/api/search` | `SearchResult[]` | `?q=` — hybrid FTS + pgvector, ranked. |
| `GET` | `/api/categories` | `Category[]` | With live component counts. |
| `GET` | `/api/tags` | `Tag[]` | All tags for autocomplete. |
| `GET` | `/api/users/:username` | `Profile` | Public profile + posted/featured components. |

---

### Component registry — writes (`JWT`)

| Method | Route | Body | Notes |
|--------|-------|------|-------|
| `POST` | `/api/components` | `CreateComponentDto` | Returns `{ id, uploadUrls }` with presigned R2 URLs |
| `PUT` | `/api/components/:id` | `UpdateComponentDto` | Owner-only. Updates name, desc, category, tags. |
| `DELETE` | `/api/components/:id` | — | Soft-delete (status → deleted). Async R2 purge. |
| `POST` | `/api/components/:id/like` | — | Toggle — idempotent upsert on likes table. |
| `POST` | `/api/components/:id/download` | `{ method }` | Log install. Increments download_count. Public route. |
| `POST` | `/api/components/:id/demos` | `CreateDemoDto` | Add demo variant. Returns new upload URLs. |
| `DELETE` | `/api/components/:id/demos/:demoId` | — | Remove demo + R2 files. |

**CreateComponentDto:**
```typescript
{
  name: string;           // max 100 chars
  description: string;    // max 500 chars
  categoryId?: string;    // UUID
  tags?: string[];        // tag slugs, max 10
  npmDependencies?: string[];
  license?: string;       // default 'MIT'
  isPublic?: boolean;     // default true
}
```

---

### File management (`JWT`)

| Method | Route | Body | Notes |
|--------|-------|------|-------|
| `POST` | `/api/upload/presign` | `PresignDto` | Returns presigned R2 PUT URL. Validates MIME + size. |
| `POST` | `/api/upload/confirm` | `ConfirmDto` | Creates file records, transitions to on_review, enqueues scan. |
| `GET` | `/api/files/:componentId` | — | Lists R2 file metadata. Owner or admin only. |
| `DELETE` | `/api/files/:fileId` | — | Deletes from R2 + DB. Owner or admin. |

**PresignDto:**
```typescript
{
  componentId: string;
  fileType: 'component' | 'demo' | 'css' | 'config';
  demoId?: string;
  contentType: string;    // validated against allowlist
  sizeBytes: number;      // validated against hard cap
  filename: string;
}
```

**ConfirmDto:**
```typescript
{
  componentId: string;
  fileKeys: Array<{ r2Key: string; fileType: string; demoId?: string }>;
}
```

---

### AI / Magic MCP (`API key`)

| Method | Route | Body | Notes |
|--------|-------|------|-------|
| `POST` | `/api/magic/generate` | `GenerateDto` | SSE stream of TSX tokens. |
| `POST` | `/api/magic/search` | `{ prompt: string }` | Returns top 5 matching components without generating. |
| `POST` | `/api/magic/enhance` | `EnhanceDto` | Existing TSX + instruction → improved TSX. |
| `GET` | `/api/magic/usage` | — | `{ used, limit, resets_at }` for caller's key. |

**GenerateDto:**
```typescript
{
  prompt: string;
  currentFile?: string;       // content of active editor file
  projectDeps: string[];      // package.json dependencies keys
  framework: 'next' | 'vite' | 'remix';
  tailwindConfig?: string;    // stringified tailwind.config.ts
  targetPath?: string;        // where component will be saved
}
```

**Response (SSE stream):**
```
data: {"type":"token","content":"'use client'\n"}
data: {"type":"token","content":"import { useState }"}
data: {"type":"done","tokensUsed":1247}
```

---

### API key management (`JWT`)

| Method | Route | Body | Notes |
|--------|-------|------|-------|
| `POST` | `/api/keys` | `{ name, scope }` | Returns plaintext key **once**. Stores hash. |
| `GET` | `/api/keys` | — | Lists caller's keys (prefix + meta, never hash). |
| `DELETE` | `/api/keys/:id` | — | Sets `revoked_at`. Immediately invalid. |

---

### User account (`JWT`)

| Method | Route | Body | Notes |
|--------|-------|------|-------|
| `GET` | `/api/me` | — | Profile + liked IDs + key prefixes. |
| `PATCH` | `/api/me` | `UpdateUserDto` | Update bio, username, avatar, social links. |

---

### Admin routes (`admin`)

| Method | Route | Body | Notes |
|--------|-------|------|-------|
| `GET` | `/api/admin/queue` | — | Paginated `on_review` components + submitter. |
| `POST` | `/api/admin/review/:id` | `ReviewDto` | Transition status. Sends email on approve. |
| `PATCH` | `/api/admin/components/:id` | any field | Admin force-update. |
| `GET` | `/api/admin/analytics` | — | Installs, signups, top components (30d). |
| `PATCH` | `/api/admin/categories/:id` | `CategoryDto` | Rename, reorder, toggle active. |
| `POST` | `/api/admin/categories` | `CategoryDto` | Add new category. |
| `GET` | `/api/admin/users` | — | Paginated user list with component counts. |
| `PATCH` | `/api/admin/users/:id` | `{ role?, banned? }` | Set role, ban/unban. |
| `GET` | `/api/admin/audit` | — | Audit log. Filter: `?user_id=`, `?action=`, `?resource_type=` |

**ReviewDto:**
```typescript
{
  action: 'approve' | 'feature' | 'reject' | 'unfeature';
  reason?: string;  // required when action = 'reject'
}
```

---

### Webhooks

| Method | Route | Verified by | Notes |
|--------|-------|------------|-------|
| `POST` | `/api/webhooks/clerk` | SVIX signature | `user.created`, `user.updated`, `user.deleted` → sync users table |

---

## 13. Next.js Middleware Stack

```typescript
// middleware.ts — Vercel Edge Runtime

import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, getAuth } from '@clerk/nextjs/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

const redis = Redis.fromEnv();

const rateLimits = {
  admin:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30,  '1 m') }),
  magic:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '1 m') }),
  auth:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '1 m') }),
  public: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m') }),
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const traceId = crypto.randomUUID();
  const resHeaders = new Headers();
  resHeaders.set('x-trace-id', traceId);

  // ── 1. CLERK JWT (browser sessions) ─────────────────────────────────────
  if (!pathname.startsWith('/api/magic') && !pathname.startsWith('/api/webhooks')) {
    const clerkRes = await clerkMiddleware()(req, {} as any);
    if (clerkRes && clerkRes.status !== 200) return clerkRes;
  }

  // ── 2. API KEY AUTH (Magic MCP routes) ──────────────────────────────────
  let apiKeyUserId: string | null = null;
  if (pathname.startsWith('/api/magic/')) {
    const rawKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!rawKey) {
      return NextResponse.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('id, user_id, monthly_count, monthly_limit, revoked_at, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (!keyRecord) {
      return NextResponse.json({ error: 'Invalid API key', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (keyRecord.revoked_at) {
      return NextResponse.json({ error: 'API key revoked', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key expired', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    apiKeyUserId = keyRecord.user_id;
    resHeaders.set('x-api-key-id', keyRecord.id);
    resHeaders.set('x-user-id', keyRecord.user_id);
  }

  // ── 3. WEBHOOK SIGNATURE VERIFICATION ───────────────────────────────────
  if (pathname.startsWith('/api/webhooks/clerk')) {
    const svixId        = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing SVIX headers', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    // Actual Webhook verification happens inside the route handler using svix npm package
  }

  // ── 4. RATE LIMITING ─────────────────────────────────────────────────────
  const { userId } = getAuth(req);
  const identifier  = apiKeyUserId ?? userId ?? req.ip ?? 'anon';

  const limiter =
    pathname.startsWith('/api/admin')  ? rateLimits.admin  :
    pathname.startsWith('/api/magic')  ? rateLimits.magic  :
    (userId || apiKeyUserId)           ? rateLimits.auth   :
                                         rateLimits.public;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  resHeaders.set('X-RateLimit-Limit',     String(limit));
  resHeaders.set('X-RateLimit-Remaining', String(remaining));
  resHeaders.set('X-RateLimit-Reset',     String(reset));

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMITED', retryAfter: reset },
      { status: 429, headers: resHeaders }
    );
  }

  // ── 5. SECURITY HEADERS ──────────────────────────────────────────────────
  const res = NextResponse.next({ request: { headers: resHeaders } });
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

---

## 14. AI Orchestration — Prompt Pipeline

### System prompt builder

```typescript
// lib/magic/prompt.ts

export interface GenerationContext {
  prompt: string;
  currentFile?: string;
  projectDeps: string[];
  framework: 'next' | 'vite' | 'remix';
  tailwindConfig?: string;
  registryMatches: Array<{
    name: string;
    description: string;
    source: string;
    similarity: number;
  }>;
}

export function buildSystemPrompt(ctx: GenerationContext): string {
  return `You are a senior design engineer specialising in React and Tailwind CSS.
Your ONLY output is a single valid TSX file. No markdown fences, no commentary, no preamble.

═══════════════════════════════════════════════════
HARD RULES — violation means CANNOT_GENERATE
═══════════════════════════════════════════════════
1. Use ONLY Tailwind utility classes. Never inline style attributes.
2. Use shadcn/ui primitives (Button, Card, Input, Dialog, Badge…) when appropriate.
3. ALL colours via shadcn CSS variables:
     bg-background, text-foreground, bg-muted, text-muted-foreground,
     border-border, bg-primary, text-primary-foreground,
     bg-secondary, text-secondary-foreground, bg-accent, bg-card,
     bg-destructive, text-destructive-foreground, ring-ring
4. Light AND dark mode must work automatically through these variables.
5. Export the component as DEFAULT export only. No named exports.
6. Do NOT import from paths that don't exist in the project.
7. Do NOT use any npm package not listed in AVAILABLE PACKAGES below.
8. Output file MUST start with either "import" or "'use client'".
9. TypeScript only. Props must be fully typed.
10. If you cannot fulfil the request within these rules: output // CANNOT_GENERATE

═══════════════════════════════════════════════════
AVAILABLE PACKAGES IN THIS PROJECT
═══════════════════════════════════════════════════
${ctx.projectDeps.join('\n')}

═══════════════════════════════════════════════════
FRAMEWORK + CONFIG
═══════════════════════════════════════════════════
Framework: ${ctx.framework}
Tailwind config: ${ctx.tailwindConfig ?? 'standard — no custom theme tokens'}
${ctx.currentFile ? `Current file context:\n${ctx.currentFile}` : ''}

═══════════════════════════════════════════════════
REGISTRY CONTEXT
Top ${ctx.registryMatches.length} components most similar to this prompt.
ADAPT these — do not copy verbatim. If a match is ≥ 90% similar to what
the user asked for, return the adapted match rather than generating from scratch.
═══════════════════════════════════════════════════
${ctx.registryMatches.map((m, i) => `
--- Registry match ${i + 1} (similarity: ${(m.similarity * 100).toFixed(0)}%) ---
Name: ${m.name}
Description: ${m.description}
Source:
${m.source}
`).join('\n')}`;
}
```

### Generation handler

```typescript
// app/api/magic/generate/route.ts

import { anthropic } from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/magic/prompt';
import { searchRegistry } from '@/lib/magic/search';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const GenerateSchema = z.object({
  prompt:        z.string().min(5).max(2000),
  currentFile:   z.string().max(10000).optional(),
  projectDeps:   z.array(z.string()).max(200),
  framework:     z.enum(['next', 'vite', 'remix']),
  tailwindConfig: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  // Auth injected by middleware
  const apiKeyId = req.headers.get('x-api-key-id')!;
  const userId   = req.headers.get('x-user-id')!;

  // ── 1. Parse + validate body ─────────────────────────────────────────────
  const body = await req.json();
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // ── 2. Usage check ───────────────────────────────────────────────────────
  const { data: keyRecord } = await supabaseAdmin
    .from('api_keys')
    .select('monthly_count, monthly_limit, month_reset_at')
    .eq('id', apiKeyId)
    .single();

  if (keyRecord && keyRecord.monthly_count >= keyRecord.monthly_limit) {
    return Response.json({
      error: 'Monthly generation limit reached',
      code: 'LIMIT_EXCEEDED',
      used: keyRecord.monthly_count,
      limit: keyRecord.monthly_limit,
      resets_at: keyRecord.month_reset_at,
      upgrade_url: 'https://21st.dev/pricing',
    }, { status: 429 });
  }

  // ── 3. Vector search for registry context ────────────────────────────────
  const registryMatches = await searchRegistry(input.prompt, 3);

  // ── 4. Build prompt ──────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    ...input,
    registryMatches,
  });

  // ── 5. Stream from Claude ─────────────────────────────────────────────────
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: input.prompt }],
  });

  // ── 6. Return SSE stream ─────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let fullOutput = '';

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const token = chunk.delta.text;
          fullOutput += token;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`)
          );
        }
      }

      // Post-process: strip accidental fences
      fullOutput = fullOutput.replace(/^```(?:tsx|typescript)?\n?/m, '').replace(/```\s*$/m, '').trim();

      // Validate TSX
      const isValid = fullOutput.startsWith("import") || fullOutput.startsWith("'use client'");
      if (!isValid) {
        // One retry with corrective prompt
        // (simplified — real impl would retry Claude call)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Invalid TSX output' })}\n\n`)
        );
      } else {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', tokensUsed: fullOutput.length })}\n\n`)
        );
      }

      // ── 7. Usage accounting ──────────────────────────────────────────────
      await supabaseAdmin
        .from('api_keys')
        .update({ monthly_count: (keyRecord?.monthly_count ?? 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', apiKeyId);

      await writeAuditLog({
        userId,
        action: 'magic.generate',
        resourceType: 'api_key',
        resourceId: apiKeyId,
        metadata: { promptLength: input.prompt.length, framework: input.framework },
      });

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
```

### Vector search implementation

```typescript
// lib/magic/search.ts

import { openai } from '@ai-sdk/openai'; // or use Supabase AI
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function searchRegistry(prompt: string, topK = 3) {
  // 1. Embed the prompt using text-embedding-3-small
  const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: prompt,
    }),
  });
  const { data } = await embeddingRes.json();
  const embedding: number[] = data[0].embedding;

  // 2. pgvector cosine similarity search
  const { data: matches } = await supabaseAdmin.rpc('search_components', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: topK,
  });

  // 3. Fetch source code from R2 for each match
  return Promise.all(
    (matches ?? []).map(async (m: any) => {
      const fileRes = await supabaseAdmin
        .from('component_files')
        .select('r2_key')
        .eq('component_id', m.id)
        .eq('file_type', 'component')
        .single();

      let source = '';
      if (fileRes.data) {
        const r2Url = `${process.env.NEXT_PUBLIC_CDN_URL}/${fileRes.data.r2_key}`;
        const content = await fetch(r2Url).then(r => r.text());
        source = content.slice(0, 3000); // trim for context budget
      }

      return { name: m.name, description: m.description, source, similarity: m.similarity };
    })
  );
}
```

```sql
-- Supabase RPC function for vector search
CREATE OR REPLACE FUNCTION search_components(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  description TEXT,
  similarity  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    1 - (c.description_embedding <=> query_embedding) AS similarity
  FROM components c
  WHERE
    c.status IN ('posted', 'featured')
    AND 1 - (c.description_embedding <=> query_embedding) > match_threshold
  ORDER BY c.description_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 15. File Upload Architecture

```
Client                 Presign API           Cloudflare R2         Worker
  │                       │                       │                   │
  │ 1. POST /upload/presign                       │                   │
  │    { componentId,     │                       │                   │
  │      fileType,        │                       │                   │
  │      contentType,     │                       │                   │
  │      sizeBytes }      │                       │                   │
  │──────────────────────▶│                       │                   │
  │                       │ validate mime (allowlist)                 │
  │                       │ validate size (hard caps)                 │
  │                       │ assert user owns component                │
  │                       │──────────────────────▶│                   │
  │                       │ getSignedUrl('PUT',   │                   │
  │                       │   key, TTL=15min,     │                   │
  │                       │   maxSize=sizeBytes,  │                   │
  │                       │   contentType)        │                   │
  │                       │◀──────────────────────│                   │
  │◀──────────────────────│                       │                   │
  │ { uploadUrl, r2Key }  │                       │                   │
  │                       │                       │                   │
  │ 2. PUT uploadUrl      │                       │                   │
  │    (TSX bytes, direct to R2 — API not involved)                  │
  │──────────────────────────────────────────────▶│                   │
  │                       │                       │ stored            │
  │                       │                       │                   │
  │ 3. POST /upload/confirm                       │                   │
  │    { componentId,     │                       │                   │
  │      fileKeys[] }     │                       │                   │
  │──────────────────────▶│                       │                   │
  │                       │ verify each r2Key exists via HEAD req     │
  │                       │──────────────────────▶│                   │
  │                       │◀── 200 OK ────────────│                   │
  │                       │ INSERT component_files                    │
  │                       │ UPDATE components                         │
  │                       │   status = on_review  │                   │
  │                       │ enqueue scan_job ─────────────────────────▶│
  │◀──────────────────────│                       │                   │
  │ { status: on_review } │                       │                   │
  │                       │                       │                   │
  │                       │              (async)  │ GET file via R2   │
  │                       │                       │◀──────────────────│
  │                       │                       │ TSX content ──────▶│
  │                       │                       │                    │ static analysis:
  │                       │                       │                    │ - eval() banned
  │                       │                       │                    │ - child_process banned
  │                       │                       │                    │ - remote <script> banned
  │                       │                       │                    │ - dangerouslySetInnerHTML guarded
  │                       │                       │    UPDATE status ◀─│
  │                       │                       │    INSERT audit_log│
```

**Presigned URL constraints (enforced by R2):**

```typescript
const MIME_ALLOWLIST = ['text/plain', 'image/png', 'image/webp', 'image/jpeg', 'video/mp4'];
const SIZE_CAPS = {
  component: 500 * 1024,        // 500 KB
  demo:      500 * 1024,        // 500 KB
  css:        50 * 1024,        //  50 KB
  config:     50 * 1024,        //  50 KB
  image:    5 * 1024 * 1024,    //   5 MB
  video:   50 * 1024 * 1024,    //  50 MB
};
const R2_KEY_TEMPLATE = (userId: string, componentId: string, fileType: string) =>
  `components/${userId}/${componentId}/${fileType}`;
```

---

## 16. Caching Strategy

| Resource | TTL | Mechanism | Invalidation |
|----------|-----|-----------|-------------|
| `GET /api/components/featured` | 5 min | Redis string | Admin `POST /api/admin/review/:id` with action=feature |
| `GET /api/components/popular` | 5 min | Redis string | Nightly cron recompute |
| `GET /api/components/:id` | 60 min | HTTP `ETag` + `Last-Modified` | `PATCH` component → update `updated_at` |
| `GET /api/categories` | 30 min | Redis string | Admin `PATCH /api/admin/categories/:id` |
| `GET /api/search?q=` | 2 min | Redis sorted set | Component status change |
| R2 file content (CDN) | 1 year | Cloudflare CDN + immutable | Key changes on new upload (content-addressed) |
| Component source for AI | 10 min | Redis hash | Upload confirm |

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const v = await redis.get<T>(key);
    return v ?? null;
  },
  async set(key: string, value: unknown, ttlSeconds: number) {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  },
  async del(...keys: string[]) {
    if (keys.length) await redis.del(...keys);
  },
};

export const CacheKeys = {
  featured:      () => 'components:featured',
  popular:       () => 'components:popular',
  categories:    () => 'categories:all',
  component:     (id: string) => `component:${id}`,
  search:        (q: string) => `search:${Buffer.from(q).toString('base64')}`,
};
```

---

## 17. Background Jobs

All jobs run on Vercel Cron (configured in `vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/recompute-counts",     "schedule": "0 2 * * *" },
    { "path": "/api/cron/purge-deleted-files",  "schedule": "0 3 * * *" },
    { "path": "/api/cron/reset-monthly-counts", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/update-embeddings",    "schedule": "0 4 * * *" }
  ]
}
```

### Job: recompute-counts (nightly 02:00 UTC)

```typescript
// Prevents download_count/like_count drift from trigger failures
await supabaseAdmin.rpc('recompute_component_counts');
```

```sql
CREATE OR REPLACE FUNCTION recompute_component_counts()
RETURNS void LANGUAGE sql AS $$
  UPDATE components c SET
    download_count = (SELECT COUNT(*) FROM downloads d WHERE d.component_id = c.id),
    like_count     = (SELECT COUNT(*) FROM likes    l WHERE l.component_id = c.id);
$$;
```

### Job: purge-deleted-files (nightly 03:00 UTC)

```typescript
// Remove R2 files for components deleted > 30 days ago
const { data: staleFiles } = await supabaseAdmin
  .from('component_files')
  .select('id, r2_key')
  .lt('created_at', thirtyDaysAgo)
  .in('component_id',
    supabaseAdmin.from('components')
      .select('id')
      .eq('status', 'deleted')
  );

for (const file of staleFiles ?? []) {
  await r2.delete(file.r2_key);
  await supabaseAdmin.from('component_files').delete().eq('id', file.id);
}
```

### Job: reset-monthly-counts (1st of month 00:00 UTC)

```typescript
await supabaseAdmin
  .from('api_keys')
  .update({
    monthly_count: 0,
    month_reset_at: nextMonthStart,
  })
  .lt('month_reset_at', new Date().toISOString());
```

### Job: update-embeddings (nightly 04:00 UTC)

```typescript
// Regenerate embeddings for components with null embedding
const { data: pending } = await supabaseAdmin
  .from('components')
  .select('id, name, description')
  .is('description_embedding', null)
  .limit(100);

for (const c of pending ?? []) {
  const embedding = await embed(`${c.name} ${c.description}`);
  await supabaseAdmin
    .from('components')
    .update({ description_embedding: embedding })
    .eq('id', c.id);
}
```

---

## 18. Error Handling Standard

### Error response shape

```typescript
interface ApiError {
  error: string;     // human-readable message
  code:  string;     // machine-readable constant
  details?: unknown; // zod errors, field info, etc.
  traceId?: string;  // correlates to logs
}
```

### Standard error codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Zod schema failure |
| 401 | `UNAUTHORIZED` | Missing or invalid auth |
| 403 | `FORBIDDEN` | Valid auth, insufficient permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate slug, key name clash |
| 413 | `PAYLOAD_TOO_LARGE` | File exceeds size cap |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | MIME not in allowlist |
| 422 | `UNPROCESSABLE` | Valid shape, invalid business logic |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error (Sentry notified) |
| 503 | `SERVICE_UNAVAILABLE` | Supabase/R2/Claude upstream down |

### Handler wrapper

```typescript
// lib/api/withHandler.ts
import * as Sentry from '@sentry/nextjs';

export function withHandler(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<Response>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
    try {
      return await handler(req, ctx);
    } catch (err: any) {
      Sentry.captureException(err, { tags: { traceId } });
      console.error(JSON.stringify({ level: 'error', traceId, err: err.message, stack: err.stack }));
      return Response.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR', traceId },
        { status: 500 }
      );
    }
  };
}
```

---

## 19. Observability & Monitoring

### Structured log format

Every request emits a single JSON log line:

```json
{
  "level": "info",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/magic/generate",
  "userId": "user_2abc...",
  "statusCode": 200,
  "durationMs": 847,
  "tokensUsed": 1247,
  "registryMatchCount": 3,
  "timestamp": "2026-04-04T10:23:41.123Z"
}
```

### Alert rules

| Alert | Condition | Channel |
|-------|-----------|---------|
| High error rate | 5xx rate > 1% over 5 min | PagerDuty |
| Auth failure spike | Auth 401s > 50/min | Slack #alerts |
| Rate limit storm | 429s > 200/min | Slack #alerts |
| Generation failure | `CANNOT_GENERATE` > 10% of magic calls | Slack #ai-ops |
| DB slow query | Query p99 > 500 ms | Slack #alerts |
| Cron job failed | Non-200 from cron endpoint | PagerDuty |

### Key metrics (Amplitude events)

| Event | Properties |
|-------|-----------|
| `component_viewed` | componentId, userId, source |
| `component_installed` | componentId, method (cli/copy/mcp) |
| `component_published` | componentId, categoryId |
| `magic_generate_started` | apiKeyId, framework |
| `magic_generate_completed` | tokensUsed, durationMs, usedRegistryMatch |
| `admin_review_action` | componentId, action, adminId |

---

## 20. Project Structure

```
21st.dev/
├── apps/
│   └── web/                          # Next.js 14 app
│       ├── app/
│       │   ├── (public)/             # Public pages (SSR)
│       │   │   ├── page.tsx          # Home feed
│       │   │   ├── [username]/
│       │   │   │   └── [slug]/
│       │   │   │       └── page.tsx  # Component detail
│       │   │   ├── s/[category]/
│       │   │   │   └── page.tsx      # Category browse
│       │   │   └── search/
│       │   │       └── page.tsx      # Search results
│       │   ├── (auth)/               # Auth-gated pages
│       │   │   ├── publish/
│       │   │   │   └── page.tsx      # Publish form
│       │   │   └── settings/
│       │   │       └── page.tsx      # Account settings
│       │   ├── (admin)/              # Admin pages
│       │   │   ├── admin/
│       │   │   │   ├── queue/
│       │   │   │   ├── analytics/
│       │   │   │   └── users/
│       │   │   └── layout.tsx        # Admin auth guard
│       │   └── api/                  # API route handlers
│       │       ├── components/
│       │       │   ├── route.ts      # GET list, POST create
│       │       │   └── [id]/
│       │       │       ├── route.ts  # GET, PUT, DELETE
│       │       │       ├── source/
│       │       │       │   └── route.ts
│       │       │       ├── like/
│       │       │       │   └── route.ts
│       │       │       ├── download/
│       │       │       │   └── route.ts
│       │       │       └── demos/
│       │       │           └── route.ts
│       │       ├── upload/
│       │       │   ├── presign/
│       │       │   │   └── route.ts
│       │       │   └── confirm/
│       │       │       └── route.ts
│       │       ├── magic/
│       │       │   ├── generate/
│       │       │   │   └── route.ts
│       │       │   ├── search/
│       │       │   │   └── route.ts
│       │       │   ├── enhance/
│       │       │   │   └── route.ts
│       │       │   └── usage/
│       │       │       └── route.ts
│       │       ├── keys/
│       │       │   └── route.ts
│       │       ├── search/
│       │       │   └── route.ts
│       │       ├── categories/
│       │       │   └── route.ts
│       │       ├── me/
│       │       │   └── route.ts
│       │       ├── users/
│       │       │   └── [username]/
│       │       │       └── route.ts
│       │       ├── r/
│       │       │   └── [username]/
│       │       │       └── [slug]/
│       │       │           └── route.ts  # shadcn registry endpoint
│       │       ├── admin/
│       │       │   ├── queue/
│       │       │   ├── review/[id]/
│       │       │   ├── analytics/
│       │       │   ├── categories/[id]/
│       │       │   ├── users/[id]/
│       │       │   └── audit/
│       │       ├── cron/
│       │       │   ├── recompute-counts/
│       │       │   ├── purge-deleted-files/
│       │       │   ├── reset-monthly-counts/
│       │       │   └── update-embeddings/
│       │       └── webhooks/
│       │           └── clerk/
│       │               └── route.ts
│       ├── lib/
│       │   ├── supabase/
│       │   │   ├── client.ts         # Browser client
│       │   │   ├── server.ts         # Server client (SSR)
│       │   │   └── admin.ts          # Service role client
│       │   ├── r2/
│       │   │   └── client.ts         # R2 SDK wrapper
│       │   ├── magic/
│       │   │   ├── prompt.ts         # System prompt builder
│       │   │   └── search.ts         # Vector search + R2 fetch
│       │   ├── cache.ts              # Redis cache helpers
│       │   ├── audit.ts              # writeAuditLog helper
│       │   ├── email.ts              # Resend wrapper
│       │   └── api/
│       │       ├── withHandler.ts    # Error boundary wrapper
│       │       └── response.ts       # Standard response helpers
│       ├── middleware.ts             # Edge auth + rate limit
│       └── .env.local
├── packages/
│   ├── types/                        # Shared TypeScript types
│   │   └── src/
│   │       ├── component.ts
│   │       ├── user.ts
│   │       └── api.ts
│   └── ui/                           # Internal component library
├── supabase/
│   ├── migrations/                   # Versioned SQL migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_vector_search.sql
│   │   └── 004_triggers.sql
│   └── seed.sql                      # Dev seed data
├── scripts/
│   └── migrate-embeddings.ts         # Backfill embeddings
├── vercel.json                       # Cron + build config
├── turbo.json                        # Turborepo pipeline
├── pnpm-workspace.yaml
└── package.json
```

---

## 21. Environment Variables

```bash
# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # safe to expose in client
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # server-only, full bypass of RLS

# ── Clerk ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...               # SVIX webhook signing secret

# ── Cloudflare R2 ─────────────────────────────────────────────────────
NEXT_PUBLIC_CDN_URL=https://cdn.21st.dev     # public CDN for R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=21st-components
NEXT_PUBLIC_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# ── Anthropic ─────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── OpenAI (for embeddings) ───────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Upstash Redis ─────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ── Resend (email) ────────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@21st.dev

# ── Monitoring ────────────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
NEXT_PUBLIC_AMPLITUDE_API_KEY=xxx

# ── App ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://21st.dev
CRON_SECRET=xxx                              # Vercel cron job auth token
```

---

## 22. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck
      - run: pnpm turbo lint
      - run: pnpm turbo test

  migrate:
    runs-on: ubuntu-latest
    needs: check
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --db-url ${{ secrets.SUPABASE_DB_URL }}

  deploy:
    runs-on: ubuntu-latest
    needs: migrate
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Deployment order (zero-downtime)

1. Run `supabase db push` — migrations are **additive only** (no column drops)
2. Deploy new Next.js build to Vercel — old + new code both compatible with new schema
3. Verify health: `GET /api/health` returns 200 with DB + R2 ping
4. Old Vercel deployment drained automatically by platform

---

## 23. Industry Practices Applied

### Twelve-Factor App compliance

| Factor | Implementation |
|--------|---------------|
| Codebase | Mono-repo with Turborepo, single source of truth |
| Dependencies | `pnpm-lock.yaml` — fully locked |
| Config | All config in environment variables, zero secrets in code |
| Backing services | Supabase, R2, Redis treated as attached resources |
| Build/release/run | Separate CI, migration, deploy stages |
| Processes | Stateless Next.js functions — no in-memory session |
| Port binding | Vercel handles, `next start` locally |
| Concurrency | Serverless auto-scales; jobs are idempotent |
| Disposability | Fast startup (edge runtime); graceful drain on deploy |
| Dev/prod parity | Same Supabase schema via migrations, Docker for local |
| Logs | Structured JSON stdout shipped to Logtail |
| Admin processes | `supabase db push`, `scripts/migrate-embeddings.ts` |

### API design standards

- **REST** — resource-oriented URLs, HTTP verbs carry semantics
- **Consistent envelope** — `{ data, meta }` success; `{ error, code, traceId }` failure
- **Idempotent mutations** — safe to retry: like toggle, upload confirm, key creation
- **Pagination** — cursor-based preferred; offset for admin views
- **Versioning** — URL prefix `/v2/` reserved but not yet needed (single active version)
- **ETag caching** — `GET /api/components/:id` returns `ETag` + supports `If-None-Match`
- **Content negotiation** — `Accept: text/event-stream` triggers SSE on generate endpoint

### Database best practices

- **pgvector IVFFlat** index tuned to `lists = sqrt(row_count)` — rebuild at 10×
- **Partial indexes** on `status IN ('posted','featured')` for hot query paths
- **Denormalised counters** with DB triggers — avoids expensive COUNT queries on hot reads
- **Expand-contract migrations** — add column → deploy → backfill → remove old column
- **Connection pooling** — Supabase Pgbouncer in transaction mode for serverless
- **Read replicas** — route analytics queries to read replica (Supabase built-in)

### Security standards

- **OWASP Top 10** mitigated: injection (parameterised queries), broken auth (Clerk), XSS (CSP), etc.
- **Principle of least privilege** — API key scopes, RLS default-deny, service-role server-only
- **Secrets management** — zero plaintext secrets in code or logs; keys hashed at rest
- **Supply chain** — `pnpm audit` in CI, Dependabot for weekly updates
- **Incident response** — Sentry alert → PagerDuty → runbook in Notion

---

*Generated: 2026-04-04 | Architecture version 1.0*  
*Stack: Next.js 14 · Supabase · Cloudflare R2 · Clerk · Upstash · Anthropic Claude*

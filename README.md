# 21st.dev — AI Component Foundry

Open-source platform for shipping AI-powered UI components. Browse, generate, and share production-ready React components.

## Architecture

```
21st.dev/
├── apps/
│   └── web/              # Next.js 16 — App Router
│       ├── src/
│       │   ├── app/      # Pages + API routes
│       │   ├── components/  # React components
│       │   ├── lib/      # Server-side infrastructure
│       │   └── middleware.ts
│       └── .env.example
├── packages/
│   ├── types/            # Shared TypeScript types + Zod schemas
│   └── ui/               # Shared UI component library
├── supabase/
│   └── migrations/       # Database schema (10 tables + RLS)
├── .github/
│   └── workflows/        # CI/CD pipeline
├── turbo.json            # Turborepo build config
└── vercel.json           # Cron job schedules
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (React 19, App Router) |
| **Database** | Supabase (Postgres + pgvector + RLS) |
| **Auth** | Clerk |
| **Storage** | AWS S3 |
| **Cache** | Upstash Redis |
| **AI** | Claude 3.5 Sonnet (generation) + OpenAI (embeddings) |
| **Email** | Resend |
| **Monitoring** | Sentry |
| **Deployment** | Vercel |

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env template
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
npx supabase db push

# Start dev server
pnpm dev
```

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/components` | Public | List with search/sort/filter |
| GET | `/api/components/[id]` | Public | Component detail |
| POST | `/api/components` | Auth | Create component |
| PUT | `/api/components/[id]` | Owner | Update component |
| DELETE | `/api/components/[id]` | Owner/Admin | Soft delete |
| POST | `/api/components/[id]/like` | Auth | Toggle like |
| GET | `/api/components/popular` | Public | Top 20 by downloads |
| GET | `/api/components/featured` | Public | Admin-curated list |
| POST | `/api/upload/presign` | Auth | Get S3 presigned URL |
| POST | `/api/upload/confirm` | Auth | Confirm upload + review |
| GET | `/api/search` | Public | Full-text search |
| GET | `/api/categories` | Public | All categories |
| POST | `/api/magic/generate` | Auth | AI component generation (SSE) |
| PUT | `/api/admin/review/[id]` | Admin | Approve/reject/feature |
| GET | `/api/admin/queue` | Admin | Review queue |
| GET | `/api/health` | Public | Health check |

## License

MIT

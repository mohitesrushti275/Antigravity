# Milestone-Based Execution Tasks

This document tracks the execution phases derived from the `implementation_plan.md`.

## Milestone 1: Project Scaffolding & Foundational UI
- [x] **Task 1.1: Initialize Next.js Workspace**
  - **Inputs:** Next.js CLI, Tailwind v4 configs.
  - **Outputs:** Next.js repository with baseline dark-theme CSS variables mapped.
  - **Dependencies:** None.
  - **Acceptance Criteria:** Local development server starts correctly; Tailwind theme defaults to dark mode natively.
- [x] **Task 1.2: Implement Sidebar & Topbar**
  - **Inputs:** Layout requirements from `frontend-spec.md`.
  - **Outputs:** Reusable `Sidebar.tsx` and `Topbar.tsx` mounted in `layout.tsx`.
  - **Dependencies:** Task 1.1.
  - **Acceptance Criteria:** Layout is fully responsive and persists across page transitions seamlessly.
- [x] **Task 1.3: Build Horizontally Scrollable Gallery**
  - **Inputs:** `page.tsx` scaffold, mock component categories.
  - **Outputs:** A snap-scrolling showcase gallery component.
  - **Dependencies:** Task 1.1.
  - **Acceptance Criteria:** Users can scroll horizontally across component cards with proper snap behavior.

## Milestone 2: Data Models & Backend Shell
- [x] **Task 2.1: Implement PostgreSQL Schema**
  - **Inputs:** `data-model.md` (defining `Component`, `AgentTemplate`, `ChatSession`).
  - **Outputs:** Initial database migrations and instantiated ORM client.
  - **Dependencies:** Milestone 1, Approved DB Stack.
  - **Acceptance Criteria:** Migrations apply successfully, enforcing referential integrity.
- [x] **Task 2.2: Component Search API Integration**
  - **Inputs:** ORM Client, dummy database seeds.
  - **Outputs:** Functioning `/api/components/search` endpoint and frontend wiring.
  - **Dependencies:** Task 2.1.
  - **Acceptance Criteria:** The Component Gallery dynamically fetches real database entries rather than mock arrays.

## Milestone 3: 21st Agents SDK & Magic Chat
- [x] **Task 3.1: Build Magic Chat UI**
  - **Inputs:** Mock conversational flows defined in `frontend-spec.md`.
  - **Outputs:** `src/app/magic/page.tsx` interactive chat interface.
  - **Dependencies:** Milestone 1.
  - **Acceptance Criteria:** UI handles message arrays properly and renders user/agent bubbles.
- [x] **Task 3.2: Integrate 21st Agents SDK**
  - **Inputs:** User's API keys (OpenAI/Anthropic), 21st Agents SDK library.
  - **Outputs:** SSE generation logic mounted on `/api/agents/execute` and `/api/chat/magic`.
  - **Dependencies:** Task 3.1, Task 2.1.
  - **Acceptance Criteria:** Chat interface receives streaming tokens seamlessly without disconnects; spend_limits per `ChatSession` constrain generations.

## Milestone 6: Architectural Repository Split (Frontend vs Backend)
- [x] **Task 6.1: Monorepo Restructuring**
  - **Outputs:** Creates `/frontend` and `/backend` isolated directories.
  - **Acceptance Criteria:** Next.js project is strictly isolated to `/frontend` without Prisma.
- [x] **Task 6.2: Node.js Express Initialization**
  - **Outputs:** Configures `backend/package.json` with `express` and transfers `/prisma` schemas.
  - **Acceptance Criteria:** Express server natively executes mapping standard JSON endpoints.
- [x] **Task 6.3: Client-Server Rewiring**
  - **Outputs:** Edits `src/app/magic/page.tsx` on the Frontend to hook into `localhost:4000`.
  - **Acceptance Criteria:** Frontend cross-origin requests hook perfectly against the autonomous backend.

## Milestone 4: Secure Sandbox Live-Preview
- [ ] **Task 4.1: Live-Preview Split Pane**
  - **Inputs:** Magic Chat UI completion.
  - **Outputs:** Dual-pane layout beside the chat interface dedicated to parsed component previews.
  - **Dependencies:** Task 3.1.
  - **Acceptance Criteria:** Magic Chat scales cleanly to fit both chat and a right-flank preview pane on large screens.
- [ ] **Task 4.2: Sandbox Evaluation Engine**
  - **Inputs:** Raw React TSX generated strings spanning from Magic Chat.
  - **Outputs:** An embedded iframe or Sandpack instance executing the code securely.
  - **Dependencies:** Task 4.1, Task 3.2, Approved Sandbox interpreter option.
  - **Acceptance Criteria:** Evaluation strictly isolates component execution; tailwind renders accurately; cross-site scripting (XSS) is neutralized.

## Milestone 5: Optimization & Deployment
- [ ] **Task 5.1: SSR Caching & Observability**
  - **Inputs:** Fully featured App router Next.js pages.
  - **Outputs:** Implemented static and dynamic caching blocks; observability logger bounds.
  - **Dependencies:** Milestones 1-4.
  - **Acceptance Criteria:** Production builds throw zero hydration warnings and perform quickly via cached endpoints.
- [ ] **Task 5.2: Launch MVP on Vercel**
  - **Inputs:** Production API keys, Repository push.
  - **Outputs:** Live public 21st Builder application.
  - **Dependencies:** Task 5.1.
  - **Acceptance Criteria:** Web app resolves successfully over HTTPS, Agent logic functions at edge without severe execution timeouts.

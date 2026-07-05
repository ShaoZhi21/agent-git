# Backend & frontend stack decision

- **Date:** 2026-07-06
- **Type:** decision (+ spec-amendment to §9)
- **Related:** spec §3, §9, §10; whole codebase to come

## Context
Choosing the primary backend language/framework before any code. This is a one-way-door decision — "one poor decision, we keep it forever" — so it was reasoned out rather than defaulted. Explicit priorities: (1) robustness / longevity, (2) end-to-end type safety, (3) avoid a future migration ("start proper"), (4) open source everywhere. Candidates weighed: **FastAPI (Python)** vs **Go** vs **NestJS (TypeScript)**.

## Key reframe
AgentGit is inherently **polyglot** — the spec forces it: eval execution is Python-native (`deepeval`, `ragas`, `inspect_ai`; note `promptfoo` is Node), GitHub is TypeScript-native (Octokit is the reference), and the frontend is fixed as Next.js/TS. So the decision is not "one language forever" but **"what language is the control plane / primary API,"** with the rest behind clean boundaries.

The workload is a **control plane** — GitHub integration + system-of-record CRUD + queue producing + LLM orchestration — **not** a high-QPS, CPU-bound data plane. That profile rewards *best integration + best type-safety-with-the-frontend*, not *fastest runtime*.

## Decision
**Primary API / control plane: NestJS (TypeScript), Fastify adapter.**
**Eval workers: a separate Python (FastAPI) service, added at Mode B.**
**Frontend: Next.js App Router + TypeScript** (unchanged from spec).

TypeScript runs end-to-end across the web tier (frontend ⇄ API) with a shared types/schema package — one source of truth, no contract drift.

### Chosen open-source stack
- **API framework:** NestJS (+ Fastify adapter)
- **DB + typed codegen:** Prisma (schema → typed client + migrations); Drizzle is the SQL-first alternative
- **Runtime validation:** zod (+ `nestjs-zod`)
- **Frontend↔API contract:** **ts-rest** contracts (typed internal + public; OpenAPI generated). *Superseded the initial tRPC plan — see [`2026-07-06-ts-rest-over-trpc.md`](2026-07-06-ts-rest-over-trpc.md).*
- **Messaging (queue + event bus):** NATS JetStream — *superseded the initial "BullMQ on Redis"; see [`2026-07-06-event-bus-nats.md`](2026-07-06-event-bus-nats.md)*
- **GitHub:** `@octokit/app`, `@octokit/webhooks`, `@octokit/rest`
- **LLM:** `@anthropic-ai/sdk`
- **Logging/testing:** pino, vitest
- **Eval workers (Mode B):** Python + FastAPI + Pydantic v2, running promptfoo/deepeval/ragas adapters
- **Data:** Postgres (Supabase/Neon), S3-compatible object store, `pgvector` in Phase 3
- **Frontend:** Next.js + TS + Tailwind + shadcn/ui + TanStack Query (all OSS)

## Why (ranked to the stated priorities)
1. **Type-safety forever** — TS gives compile-time safety *and* shares types with the already-TS frontend. FastAPI can't match a single-source-of-truth type contract (it bridges via OpenAPI codegen). This is the biggest won't-regret-it lever.
2. **Start proper, don't migrate** — NestJS is enterprise-from-day-one (DI, modules, guards) — the structure you'd otherwise migrate *to*. Good fit for Phase 2/3 orgs/RBAC/billing.
3. **Best tools for the actual job** — Octokit is the canonical GitHub integration and is TS-native; the messaging client (NATS) is first-class in TS too. The two most core mechanics live in your primary language.
4. **Defer the polyglot boundary** — the MVP (spec §10 steps 1–7) uses eval **Mode A**, where evals run in the user's CI and POST results back. That entire smallest-lovable demo is **TS-only**. Python enters only at Mode B (step 9), isolated in an HTTP-callback sandbox running untrusted eval code — exactly where it belongs.

## Alternatives considered
- **FastAPI (Python-everything):** coherent + AI-native (shared Pydantic models across API and workers, best AI-coding support, typed GitHub via `githubkit`). Rejected as primary because gradual typing isn't compile-enforced and there's no shared-source typing with the TS frontend. Would be the pick if AI-ecosystem cohesion outranked frontend type-sharing.
- **Go:** best pure-infra robustness/concurrency (`sqlc`, `go-github`, `asynq`). Rejected as primary — can share types with neither the TS frontend nor the Python workers, and fights LLM-orchestration logic. **Reserved** for a future high-throughput hot path (e.g. webhook/trace ingest) as a dedicated microservice.

## Spec amendment
Overrides spec §9's suggestion of "API via Next.js route handlers." Rationale: webhooks, queues, long-running jobs, and cron want a **dedicated long-running NestJS service**, not serverless route handlers. Next.js remains the frontend (UI/SSR); NestJS is the backend. `docs/architecture.md` and `docs/spec.md` §9 updated to match.

## Consequences / open items
- Repo will be a TS monorepo (`apps/web`, `apps/api`, `packages/shared`) + a separate `services/eval-worker` (Python) added at Mode B.
- ~~BullMQ is Node-only on the wire...~~ **Resolved** by [`2026-07-06-event-bus-nats.md`](2026-07-06-event-bus-nats.md): messaging is **NATS JetStream** (polyglot, but the eval sandbox reports over HTTP and never consumes the bus anyway), so no cross-language broker bridge is needed and **no Redis is required** for the MVP.
- Prisma vs Drizzle is still open — default Prisma (migration ergonomics) unless we want SQL-first.
- API typing resolved to **ts-rest** (see the ts-rest ADR) — contract-first, one source for typed client + OpenAPI.

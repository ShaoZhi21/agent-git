# Architecture

High-level system shape. This is a **summary + pointer** — the authoritative detail (with the full ASCII diagram, data model, and API shapes) is in [`spec.md`](spec.md) §3, §5. Keep this file in sync when architectural decisions change, and record the decision in `../changes/`.

## Stack decision

**Primary API / control plane = NestJS (TypeScript); frontend = Next.js (TypeScript); eval workers = Python (FastAPI), added at Mode B.** TypeScript runs end-to-end across the web tier with a shared types package (one source of truth). Rationale, alternatives (FastAPI, Go), and the full OSS library list are in [`../changes/2026-07-06-backend-stack-decision.md`](../changes/2026-07-06-backend-stack-decision.md). This deliberately overrides spec §9's "API via Next.js route handlers" (webhooks/queues/cron want a dedicated long-running service).

## Components (spec §3)

| Component | Stack | Responsibility |
|---|---|---|
| **Frontend** | Next.js (App Router) + TypeScript · Tailwind · shadcn/ui · TanStack Query | UI: dashboard, checkpoint timeline, regression + diff views, diagnosis output. Typed against the API via tRPC/OpenAPI client. |
| **Backend API (control plane)** | NestJS + Fastify · Drizzle · zod · ts-rest (typed API + OpenAPI) | Auth, all DB read/write, install flow, webhook receiver, event producer. Long-running service (not serverless route handlers). See [`conventions/backend-structure.md`](conventions/backend-structure.md). |
| **GitHub App integration** | `@octokit/app`, `@octokit/webhooks`, `@octokit/rest` (in the API) | Installation flow, webhook receiver (`push`, `pull_request`, `installation`), repo reads, PR comments + Check Runs. |
| **Postgres** | Supabase/Neon; `pgvector` in Phase 3 | System of record: agents, checkpoints, eval runs/cases, regressions, installs, orgs, users. |
| **Object storage** | any S3-compatible | Large blobs — traces, raw eval output. Postgres stores metadata + a URL. |
| **Event bus** | NATS JetStream | Single backbone for job queue **and** event fan-out. Producers: webhook receiver, eval-result callback, control-plane logic, user actions, cron. Transactional publishes via the **outbox pattern**. See [`../changes/2026-07-06-event-bus-nats.md`](../changes/2026-07-06-event-bus-nats.md). |
| **Eval Runner** | Mode A: GitHub Action (user's CI). Mode B: Python + FastAPI + Pydantic v2 **HTTP-callback sandbox** | Executes eval suites → structured results, then **POSTs back to `/api/eval-runs`** (never consumes the bus). Mode A ships first (TS-only path); Mode B (hosted Python sandbox) added later. |
| **Diagnosis Agent** | `@anthropic-ai/sdk` (Claude), in the API | Reasons over config diff + eval delta + failing traces → human-readable cause + recommendation. |

## Data flow (the happy path)

```
push/PR webhook ──► create Checkpoint (F3) ──► run eval (F4) ──► attach eval_run + eval_cases
                                                     │
                                                     ▼
                                        compare vs baseline (F6)
                                                     │
                                       regression? ──yes──► bound traces + PR comment + Check Run
                                                     │                    │
                                                     │                    ▼
                                                     │           Diagnosis Agent (F8): why + fix
                                                     ▼
                                            render on agent timeline (F5)
```

## Data model

Full DDL is in [`spec.md`](spec.md) §5. Core tables and their relationships:

```
installations ─1:N─ repos ─1:N─ agents ─1:N─ checkpoints ─1:N─ eval_runs ─1:N─ eval_cases
                                   │                 │
                                   │                 └── referenced by regressions (from_checkpoint / to_checkpoint)
                                   └─1:N─ datasets
users            (GitHub OAuth identities)
```

The join that makes AgentGit different: **`checkpoints ⇄ eval_runs`** — every version knows its own score. Git structurally cannot do this.

## Key architectural principles

- **Overlay, not framework.** AgentGit reads the agents a team already has; it never asks them to rewrite or adopt a framework (spec §8).
- **We run no untrusted code in Mode A.** The user's CI runs their eval; we ingest results. Only Mode B introduces a sandbox, and only when needed.
- **Blobs out, metadata in.** Traces and raw output go to object storage; Postgres keeps the structured, queryable metadata + URLs.
- **Checkpoint-centric.** Every table hangs off the checkpoint or the agent that owns it. New surface area should attach here, not float free.
- **Event-driven by default.** State changes are published as events on NATS JetStream; features subscribe. A job queue is just the one-consumer case of the same bus. New reactive behaviour = a new subscriber, not a new polling path.
- **TypeScript end-to-end; Python only inside HTTP-callback eval sandboxes.** The web tier (frontend + API) is one TS codebase sharing types. The only Python is the Mode B eval sandbox, which runs untrusted code and reports back over HTTP — it never consumes the bus. Don't introduce a language boundary anywhere else without a recorded decision.

## Decisions log

Architectural decisions and their rationale are recorded in [`../changes/`](../changes/). When you make a call that future-you would want the reasoning for, write it there.

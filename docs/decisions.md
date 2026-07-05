# Technical Decision Register

Status index of the **heavy, one-way-door decisions** for AgentGit — the ones expensive or impossible to reverse once code and data depend on them. This file tracks *what's decided*; the **why** lives in [`../changes/`](../changes/) (ADRs) and the **how** lives in [`conventions/`](conventions/).

**Legend** — Heat: 🔴 one-way door · 🟡 costly to change · 🟢 cheap. Status: ✅ decided · 🟠 direction set, tool TBD · ⬜ open.

> **As of 2026-07-06: all foundational decisions are locked.** New foundational choices: add a row, write an ADR in `changes/`, and (if it governs day-to-day coding) a `conventions/` doc.

---

## Register

| # | Decision | Choice | Heat | Status | Why (ADR) | How (convention) |
|---|---|---|---|---|---|---|
| — | Backend stack | NestJS + Fastify (TS) + Python sandbox | 🔴 | ✅ | [backend-stack](../changes/2026-07-06-backend-stack-decision.md) | — |
| — | Messaging | NATS JetStream (bus + queue), outbox | 🔴 | ✅ | [event-bus](../changes/2026-07-06-event-bus-nats.md) | [events](conventions/events.md) |
| **G1** | Self-hostable core | Yes — by construction | 🔴 | ✅ | [open-core](../changes/2026-07-06-open-core-self-host.md) | — |
| **G2** | OSS stance | Open-core, Apache-2.0 core + commercial | 🔴 | ✅ | [open-core](../changes/2026-07-06-open-core-self-host.md) | — |
| **D1** | Multi-tenancy | Shared DB + `org_id` + Postgres RLS | 🔴 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [data-model](conventions/data-model.md) |
| **D6** | ORM | Drizzle | 🟡 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [data-model](conventions/data-model.md) |
| **D8** | Primary keys | UUIDv7 | 🟡 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [data-model](conventions/data-model.md) |
| **audit** | History | Append-only + audit log | 🟡 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [data-model](conventions/data-model.md) |
| **D2** | AuthN / identity | Internal `user_id`; providers map in; behind a boundary | 🔴 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [auth](conventions/auth.md) |
| **D3** | AuthZ | One `authorize()` layer; RBAC now → OpenFGA later | 🔴 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [auth](conventions/auth.md) |
| **D4** | Public contracts | Versioned from v1; `agentgit-json` carries a version | 🔴 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [api-and-versioning](conventions/api-and-versioning.md) |
| **D5** | Event schema | CloudEvents envelope + schema registry + outbox | 🟡 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [events](conventions/events.md) |
| **D9** | Secrets / BYOK | Envelope encryption behind KMS interface (Vault default) | 🟡 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | [security](conventions/security.md) |
| **D7** | Database host | Vanilla Postgres (Neon dev); no proprietary features | 🟡 | 🟠 | [open-core](../changes/2026-07-06-open-core-self-host.md) | [data-model](conventions/data-model.md) |
| **D10** | Eval sandbox (Mode B) | gVisor/Firecracker, HTTP-callback, egress-locked | 🔴 | 🟠 | [foundational](../changes/2026-07-06-foundational-decisions.md) | [security](conventions/security.md) |
| **D11** | Observability | OpenTelemetry from day 1 | 🟢 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | — |
| **D12** | Monorepo tooling | pnpm + Turborepo | 🟡 | ✅ | [foundational](../changes/2026-07-06-foundational-decisions.md) | — |
| **D13** | Frontend routing | Next.js App Router (built-in; no separate router) | 🟢 | ✅ | — | [frontend-routing](conventions/frontend-routing.md) |
| **D14** | API contract mechanism | ts-rest (typed internal + public; OpenAPI-generated) | 🟡 | ✅ | [ts-rest](../changes/2026-07-06-ts-rest-over-trpc.md) | [api-and-versioning](conventions/api-and-versioning.md) · [backend-structure](conventions/backend-structure.md) |

🟠 = the OSS/self-hostable *direction* is locked (by G1); the exact tool/host is a deployment detail finalized when first built.

## The recurring pattern

For the 🔴 one-way doors, the move was **"build the clean seam now; slot the heavier implementation in later"** — RLS + `org_id` in the schema from row zero, one identity boundary (not GitHub hardwired), one `authorize()` layer (not scattered role checks), one versioned event envelope, versioned external contracts. Detail in [`conventions/`](conventions/).

## Explicitly *not* decisions to agonize over (two-way doors)
Styling (Tailwind), component lib (shadcn/ui), data-fetching (TanStack Query), cloud/region, logging lib, test runner, CI provider. Pick the sane default, change freely later.

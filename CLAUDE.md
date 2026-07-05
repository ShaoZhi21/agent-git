# CLAUDE.md

Operating manual for Claude Code (and any AI coding agent) working in this repository. Read this first, then [`docs/spec.md`](docs/spec.md).

## What this project is

**AgentGit** (working name, placeholder — "GitHub for AI agents") — the record of every AI agent a company runs and whether it works. Connects to agents a team already has (no rewrite), versions each as a **Checkpoint**, evaluates every change, and flags + diagnoses regressions. See [`README.md`](README.md) for the pitch and [`docs/spec.md`](docs/spec.md) for the full spec.

**Current status:** pre-code. This repo holds the spec and structure only. There is no application code yet. When you start building, follow the build order in spec §10 and record what you did in `changes/`.

## The one mental model to keep

Everything is built around the **Checkpoint** — an immutable snapshot of an agent at a commit (prompt + skills + tools + code) plus its measured quality (eval result + cost). Every feature is one of: **produce** a checkpoint, **evaluate** one, **compare** two, or **reason about the delta** between two. If a change you're considering doesn't touch a checkpoint, question whether it belongs (spec §2.2, §8).

## Source of truth & precedence

1. **`docs/spec.md`** is canonical for *what to build and why*. If code and spec disagree, the spec wins — or the spec is wrong and you update it deliberately (and note it in `changes/`).
2. **AgentGit** is a placeholder working name and will likely change. Keep the name in one findable form so a future rename is a clean find-replace; don't scatter variants.
3. Don't silently drift from the spec. If you deviate, write a change record explaining why (see `changes/`).

## Repository map — where things live

| Path | Purpose | When to touch it |
|---|---|---|
| `docs/spec.md` | The canonical spec. | Only for deliberate spec amendments; note in `changes/`. |
| `docs/glossary.md` | Domain vocabulary. | When a new domain term appears — keep it defined once, here. |
| `docs/architecture.md` | System shape + component responsibilities. | When architecture decisions change. |
| `docs/decisions.md` | Register (status index) of heavy one-way-door decisions. | Consult before any foundational choice; flip status + link an ADR when one is decided. |
| `docs/conventions/` | Living "how we build X" references — data-model, api-and-versioning, events, auth, security. | **Read the relevant one before writing code in that area.** They encode locked decisions. |
| `features/` | One forward-looking spec per feature (F1–F13). | When starting a feature: draft/expand its file before coding. |
| `changes/` | Dated change & decision records (ADR-style). | After any meaningful change or decision. |
| `.claude/skills/` | Project-specific skills for AI coding. | When a repeatable workflow emerges worth codifying. |
| `.claude/agents/` | Project-specific subagent definitions. | When a specialized subagent would help. |
| `.claude/memory/` | Cross-session knowledge; `MEMORY.md` is the index. | When you learn something non-obvious future sessions need. |

Each directory has a `README.md` documenting its own convention — read it before adding files there.

## How to work here (AI-native workflow)

The user codes **heavily** with AI. Optimize for that:

1. **Before building a feature:** read the relevant feature spec in `features/` (create it from the spec §7 if it doesn't exist yet) **and the relevant `docs/conventions/` doc(s)** for any DB/API/event/auth/security work. Confirm scope against spec §8 non-goals.
2. **While building:** keep changes aligned to the Checkpoint model. Use the **chosen stack** (see below), not spec §9 verbatim where they differ.
3. **After a meaningful change:** add a record in `changes/` and update `docs/` if behavior or architecture shifted. Update `.claude/memory/` with any non-obvious learning.
4. **Keep docs current.** Stale docs are worse than none in an AI-native repo — agents trust them. If you change something documented, update the doc in the same pass.

## Tech stack (decided — see `changes/2026-07-06-backend-stack-decision.md`)

- **Frontend:** Next.js (App Router) + TypeScript · Tailwind · shadcn/ui · TanStack Query.
- **Backend API (control plane):** **NestJS + Fastify** (a dedicated long-running service, *not* Next.js route handlers) · Prisma · zod · tRPC (internal) / OpenAPI (public) · **NATS JetStream** (event bus + job queue) · `@octokit/*` · `@anthropic-ai/sdk`.
- **Messaging:** **NATS JetStream** is the single backbone for both event fan-out and job queueing (see `changes/2026-07-06-event-bus-nats.md`). Publish atomically with DB writes via the **outbox pattern**. No Redis required for the MVP.
- **Eval workers:** Python + FastAPI + Pydantic v2 — a **separate HTTP-callback sandbox added only at Mode B** (build step 9); it runs the eval and POSTs results to `/api/eval-runs`, never consuming the bus. The MVP (steps 1–7, eval Mode A) is TS-only.
- **Data:** Postgres (Supabase/Neon) · S3-compatible object store · `pgvector` in Phase 3.
- **Principle:** Event-driven by default (new reactive behaviour = a new NATS subscriber). TypeScript end-to-end across the web tier; Python only inside HTTP-callback eval sandboxes. Prefer robust **open-source** building blocks for anything new — don't hand-roll or reach for proprietary-only.

## Conventions

- **Naming:** product = AgentGit (placeholder). Core object = **Checkpoint**. Users = **Builder** and **Consumer**. Use these exact terms; they're defined in `docs/glossary.md`.
- **Open-core & self-hostable (locked):** the OSS core is **Apache-2.0** and must run self-hosted. Every core-path dependency must be **permissive-OSS** (MIT/Apache/BSD/ISC) and self-hostable — no managed-only services, no AGPL/SSPL/BSL in the distributed core. Managed services only behind an interface with an OSS equivalent. Team/enterprise features are the commercial layer. See `docs/decisions.md` + `changes/2026-07-06-open-core-self-host.md`.
- **Phasing discipline:** don't build Phase 2/3 features while Phase 1 is unvalidated (spec §1.4, §4, §10). The sequencing rule: *attribute of a checkpoint → early; a system you'd have to operate → late or out.*
- **Config convention:** the repo AgentGit connects to declares agents via an optional `agentgit.yaml` at its root (spec §6). Detection is heuristic-first; config only overrides.
- **Secrets:** never commit keys. BYOK provider keys are encrypted at rest and only decrypted inside eval sandboxes (spec §9).

## What NOT to do (spec §8)

Do not build: auto-fix / code-modifying agent · inference hosting/routing/gateway · fine-tuning · a deploy system (at most open a PR) · a general observability/logging platform · a framework for authoring agents. AgentGit is an **overlay**, never a framework.

## Build order (spec §10, condensed)

1. Auth + GitHub App skeleton (F1) → 2. Repo read + detection (F2) → 3. Checkpoint on push (F3) → 4. Eval runner Mode A / GitHub Action (F4) → 5. Timeline UI (F5) → 6. Regression detection + PR comment (F6) → 7. Diagnosis agent (F8) → 8. Behavioral diff + rewind (F7) → 9. Dataset builder + hosted runner (F9, F4 Mode B).

**Steps 1–7 are the smallest lovable demo:** connect → see quality timeline → catch a regression on a PR → get told why.

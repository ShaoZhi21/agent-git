# MEMORY.md — AgentGit project memory index

Cross-session knowledge for AI coding agents. This file is the **index** loaded at the start of a session — one line per memory. Full memories live as sibling files in this folder. Keep entries to one line; put the content in its own file.

Write a memory when you learn something **non-obvious** a future session would need and that isn't already captured in `docs/`, `changes/`, or the code itself (e.g. a gotcha, a hard-won convention, an external constraint). Don't duplicate the spec.

## How to add a memory

1. Create `.claude/memory/<slug>.md` with the fact (and, for decisions, why + how to apply).
2. Add a one-line pointer below: `- [Title](slug.md) — hook`.
3. If a memory becomes wrong, delete both the file and its line.

## Index

_(none yet — this is a fresh repo)_

## Standing context (always true)

- **Source of truth:** `docs/spec.md` — the canonical spec. Product working name: **AgentGit** (placeholder, expected to change).
- **Core primitive:** the **Checkpoint** — read `CLAUDE.md` for the mental model.
- **Stack (decided):** NestJS+Fastify API (TS) · Next.js frontend (TS) · Python/FastAPI eval sandbox (Mode B only, HTTP-callback) · Prisma · **NATS JetStream** (event bus + queue, outbox pattern) · Octokit. See `changes/2026-07-06-backend-stack-decision.md` + `changes/2026-07-06-event-bus-nats.md`. Event-driven; TS end-to-end; Python only inside HTTP-callback sandboxes; no Redis for MVP.
- **Licensing (locked):** open-core — Apache-2.0 self-hostable core (Phase 1) + commercial team/enterprise (Phase 2/3). Core-path deps must be permissive-OSS + self-hostable (no managed-only, no AGPL/SSPL/BSL in core). See `changes/2026-07-06-open-core-self-host.md`.
- **Foundations (locked 2026-07-06):** multi-tenancy = shared DB + `org_id` + Postgres RLS · ORM = Drizzle · IDs = UUIDv7 · history append-only + audit log · AuthN behind identity boundary (internal `user_id`) · AuthZ = one `authorize()` layer (RBAC→OpenFGA) · external contracts versioned from v1 · events = CloudEvents envelope + outbox · BYOK = envelope encryption behind KMS interface · sandbox = gVisor/Firecracker HTTP-callback · OTel from day 1 · pnpm+Turborepo. **How-to in `docs/conventions/`; register in `docs/decisions.md`.** Read the relevant convention doc before coding in that area.
- **Status:** pre-code. No application code exists yet; features to be vetted before building.
- **Phasing discipline:** Phase 1 only until the §1.4 assumption is validated. Non-goals in spec §8 are hard boundaries.

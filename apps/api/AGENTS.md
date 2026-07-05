# apps/api — AGENTS.md

**Read before editing this folder. Update the "Structure" and "Notes" sections when you change its shape.**

## Purpose
The **control plane** — the long-running backend service. Owns: auth, all DB read/write, GitHub App install + webhook receiver, event production (to NATS), and orchestration (diagnosis calls). A dedicated NestJS service, **not** Next.js route handlers.

## Stack
NestJS + **Fastify adapter** · Drizzle (via `@agent-git/db`) · zod · tRPC (internal API) / OpenAPI (public API) · `@octokit/*` · `@anthropic-ai/sdk` · NATS JetStream client.

## Conventions that apply (read before coding)
- [`docs/conventions/data-model.md`](../../docs/conventions/data-model.md) — set the RLS tenant context per request; never hand-filter `org_id`.
- [`docs/conventions/auth.md`](../../docs/conventions/auth.md) — all permission checks through one `authorize()`; identity behind the boundary.
- [`docs/conventions/api-and-versioning.md`](../../docs/conventions/api-and-versioning.md) — tRPC internal, versioned OpenAPI public.
- [`docs/conventions/events.md`](../../docs/conventions/events.md) — publish via the outbox pattern.
- [`docs/conventions/security.md`](../../docs/conventions/security.md) — verify webhook signatures; BYOK handling.

## Structure (agent-maintained — update when it changes)
```
src/
  main.ts        placeholder — bootstrap Nest+Fastify (TODO F1)
  (modules added per feature: auth/, github/, checkpoints/, evals/, ...)
```

## Entry points
- `src/main.ts` — app bootstrap.

## Status
Scaffold — not implemented. First work: build step 1 (F1, GitHub App skeleton).

## Notes (agent-maintained)
- 2026-07-06 — folder scaffolded; NestJS uses CommonJS + decorator metadata (see `tsconfig.json`), intentionally different from the ESM base.

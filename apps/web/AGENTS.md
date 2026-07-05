# apps/web — AGENTS.md

**Read before editing this folder. Update "Structure" and "Notes" when you change its shape.**

## Purpose
The **frontend** — dashboard UI. The primary screen is the per-agent **checkpoint timeline** (F5): each version with its eval score, delta, cost; plus regression + diff views and the diagnosis output. Typed against the API; holds no business logic.

## Stack
Next.js (App Router) + TypeScript · Tailwind · shadcn/ui · TanStack Query · typed API client (tRPC for internal / generated OpenAPI client for public).

## Conventions that apply
- Consume the API's types directly (tRPC) — never redefine request/response shapes here (see [`api-and-versioning.md`](../../docs/conventions/api-and-versioning.md)).
- UI-only. Anything touching the DB, GitHub, or the bus belongs in `apps/api`.

## Structure (agent-maintained)
```
(empty scaffold — Next.js app created at build step 5, F5 timeline UI)
```
When starting F5: initialize the App Router structure (`app/`), Tailwind, and the typed API client.

## Status
Scaffold — not implemented. First work: build step 5 (F5, checkpoint timeline). Earlier steps (1–4) are API/backend-only.

## Notes (agent-maintained)
- 2026-07-06 — folder reserved; kept empty until F5 to avoid stale boilerplate.

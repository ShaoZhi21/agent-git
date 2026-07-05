# apps/web — AGENTS.md

**Read before editing this folder. Update "Structure" and "Notes" when you change its shape.**

## Purpose
The **frontend** — dashboard UI. The primary screen is the per-agent **checkpoint timeline** (F5): each version with its eval score, delta, cost; plus regression + diff views and the diagnosis output. Typed against the API; holds no business logic.

## Stack
Next.js (App Router) + TypeScript · Tailwind · shadcn/ui · TanStack Query · typed API client (tRPC for internal / generated OpenAPI client for public).

## Conventions that apply
- **[`frontend-routing.md`](../../docs/conventions/frontend-routing.md)** — Next.js App Router: route groups, server components, typed routes, auth middleware. Read before adding any page.
- Consume the API's types directly (tRPC) — never redefine request/response shapes here (see [`api-and-versioning.md`](../../docs/conventions/api-and-versioning.md)).
- UI-only. Anything touching the DB, GitHub, or the bus belongs in `apps/api`.

## Structure (agent-maintained)
```
app/
  layout.tsx                   root layout (html/body)
  page.tsx                     /              landing (public)
  globals.css
  login/page.tsx               /login         sign-in (public)
  (app)/                       auth route GROUP — no URL segment
    layout.tsx                 authenticated shell
    dashboard/page.tsx         /dashboard          agent list (TODO F2)
    agents/[agentId]/page.tsx  /agents/:agentId    timeline (TODO F5)
    providers.tsx              TanStack Query provider (client component)
lib/api.ts                     typed ts-rest client (bound to @agent-git/contracts)
middleware.ts                  auth-gates /dashboard + /agents/*
next.config.ts                 typedRoutes on; transpiles workspace pkgs
```
Routing is the Next.js **App Router** — see [`frontend-routing.md`](../../docs/conventions/frontend-routing.md). The data layer (TanStack Query + typed ts-rest client) is wired. Tailwind + shadcn/ui are added when UI work starts.

## Status
**Built and verified** — `next build` produces `/`, `/login`, `/dashboard`, `/agents/[agentId]` + middleware; installed; typechecks. Pages are placeholders. First real UI: `/dashboard` (F2), then the `/agents/[agentId]` timeline (F5).

## Notes (agent-maintained)
- 2026-07-06 — App Router + data layer wired (route groups, typed routes, auth middleware, TanStack Query, ts-rest client). Builds clean.

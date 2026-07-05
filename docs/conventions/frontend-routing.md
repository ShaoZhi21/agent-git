# Frontend Routing Conventions

**Read before adding any page, route, or navigation.** Governs how routing works in `apps/web`.

## Decision: Next.js App Router (built-in — no separate router)

Routing is the **Next.js App Router** — the file-system router built into Next.js (open source, MIT). It is **not** a separate dependency. Because we chose Next.js (see [`../decisions.md`](../decisions.md)), the router came with it.

**Do not add another router** (React Router, TanStack Router, etc.) on top of Next.js — that's an anti-pattern and breaks SSR/RSC, layouts, and streaming. TanStack Router is excellent, but for a *Vite/SPA* app, not a Next.js app.

Why App Router fits: nested layouts, React Server Components (fetch on the server, less client JS), per-segment `loading`/`error` boundaries, streaming, and file-based clarity — all first-class.

## The model (how routes are defined)

Folders under `app/` are routes; special files give them behavior:

| File | Meaning |
|---|---|
| `page.tsx` | Makes the segment a routable page. |
| `layout.tsx` | Shared shell that **wraps** child routes (nests). |
| `loading.tsx` | Suspense fallback for the segment. |
| `error.tsx` | Error boundary (must be a Client Component). |
| `not-found.tsx` | 404 UI for the segment. |
| `[param]` | Dynamic segment (e.g. `[agentId]`). |
| `[...slug]` | Catch-all segment. |
| `(group)` | **Route group** — organizes files / applies a layout **without** adding a URL segment. |
| `middleware.ts` (root) | Runs before matched requests — used here for auth-gating. |

## Our route map

```
app/
  layout.tsx                      root layout (html/body) — wraps everything
  page.tsx                        /                     landing (public)
  login/page.tsx                  /login                sign-in (public)
  (app)/                          route GROUP — auth shell, no URL segment
    layout.tsx                    shared authenticated shell (nav)
    dashboard/page.tsx            /dashboard            agent list (F2)
    agents/[agentId]/page.tsx     /agents/:agentId      checkpoint timeline (F5)
middleware.ts                     gates /dashboard + /agents/*
```

Note the `(app)` group: it applies the authenticated layout to `/dashboard` and `/agents/*` **without** turning into `/app/...`. Keep public routes (`/`, `/login`) outside it.

## Conventions

- **Server Components by default.** Add `'use client'` only when a file needs interactivity, state, or browser APIs. Push client boundaries as deep as possible.
- **The web app is UI-only.** It calls the NestJS API; it does **not** define `app/api/*` business routes — the control plane is `apps/api` (see [`api-and-versioning.md`](api-and-versioning.md)). At most a thin auth-callback or health route, if ever.
- **Data fetching:** Server Components fetch on the server (via the typed API client); client interactivity uses **TanStack Query**. Never hand-redefine API response shapes — import types from the API/`@agent-git/contracts`.
- **Navigation:** use `next/link`'s `<Link>` and `useRouter()` from `next/navigation`. Do not use `<a>` for internal links.
- **Type-safe routes:** `experimental.typedRoutes` is **on** (`next.config.ts`) — `href`s are checked against the real route tree at build time. Fix the type error, don't cast.
- **Dynamic params are async (Next 15):** `params` is a `Promise` — `await` it in the page.
- **Auth-gating:** `middleware.ts` matches the protected routes and (once F1 lands) redirects unauthenticated users to `/login`. Add newly-protected paths to its `matcher`.
- **Metadata:** use the `Metadata` API (export `metadata` or `generateMetadata`) in layouts/pages — not `<head>` tags.
- **Validate untrusted route input:** if a dynamic param drives a fetch, validate it (zod) at the boundary.

## Status

Scaffolded: config (`next.config.ts`, `tsconfig.json`), root layout, the `(app)` auth group, and `middleware.ts` exist as placeholders. Real pages arrive per feature — `/dashboard` at F2, the `/agents/[agentId]` timeline at F5. `pnpm install` has not been run yet (deps resolve on first install).

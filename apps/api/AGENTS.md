# apps/api — AGENTS.md

**Read before editing this folder. Update the "Structure" and "Notes" sections when you change its shape.**

## Purpose
The **control plane** — the long-running backend service. Owns: auth, all DB read/write, GitHub App install + webhook receiver, event production (to NATS), and orchestration (diagnosis calls). A dedicated NestJS service, **not** Next.js route handlers.

## Stack
NestJS + **Fastify adapter** · Drizzle (via `@agent-git/db`) · zod · **ts-rest** contracts (typed API + OpenAPI) · `@octokit/*` · `@anthropic-ai/sdk` · NATS JetStream client.

## Conventions that apply (read before coding)
- [`docs/conventions/backend-structure.md`](../../docs/conventions/backend-structure.md) — **read first**: module/controller/service pattern, request lifecycle, ts-rest endpoints, build quirks.
- [`docs/conventions/data-model.md`](../../docs/conventions/data-model.md) — set the RLS tenant context per request; never hand-filter `org_id`.
- [`docs/conventions/auth.md`](../../docs/conventions/auth.md) — all permission checks through one `authorize()`; identity behind the boundary.
- [`docs/conventions/api-and-versioning.md`](../../docs/conventions/api-and-versioning.md) — ts-rest contracts; versioned public surface.
- [`docs/conventions/events.md`](../../docs/conventions/events.md) — publish via the outbox pattern.
- [`docs/conventions/security.md`](../../docs/conventions/security.md) — verify webhook signatures; BYOK handling.

## Structure (agent-maintained — update when it changes)
```
src/
  main.ts                bootstrap (Fastify, global prefix /api, exception filter)
  app.module.ts          root module (imports features + global interceptor)
  config/                validated env (zod) via @nestjs/config
  common/filters|pipes|interceptors/   cross-cutting (problem+json, zod, logging, tenant ctx)
  health/                native module — GET /api/health
  system/                ts-rest reference — GET /api/v1/system/info
  github/                GitHub App auth (F1.3): AppAuthService (App JWT +
                         installation-token exchange, cached) + OctokitFactory;
                         webhook receiver (F1.5): HMAC-verified POST
                         /api/github/webhooks -> WebhooksService dispatch
  (feature modules added per build step: auth/, checkpoints/, evals/, ...)
test/                    Vitest — unit + integration (msw mocks GitHub)
```

## Entry points
- `src/main.ts` — bootstrap. `src/app.module.ts` — module registry.
- Reference endpoints: `health/` (native), `system/` (ts-rest contract).

## Status
**Skeleton built and verified** — `pnpm build` + boots on Fastify; `/api/health` and `/api/v1/system/info` respond; 404s return `problem+json`. Feature modules start at build step 1 (F1).

## Notes (agent-maintained)
- 2026-07-06 — NestJS skeleton implemented (Fastify, config, cross-cutting, health + ts-rest reference). Quirks (CJS libs, `@ts-rest/core` + `fastify` as direct deps, `as const` literals) documented in `docs/conventions/backend-structure.md`. Runs.
- 2026-07-06 — F1.3: `github/` module. **`@octokit/rest` is pinned to v20** — v21+ is pure ESM and cannot be `require`d from this CJS build. `GITHUB_APP_PRIVATE_KEY` accepts PEM with literal `\n` escapes (normalized in `AppAuthService`). Installation tokens are cached per installation id with a 60s pre-expiry refresh margin. GitHub HTTP is mocked with `msw` in tests (intercepts native `fetch`, which Octokit v20 also uses).
- 2026-07-06 — F1.5 (receiver half): `main.ts` bootstraps with **`{ rawBody: true }`** — HMAC signs raw bytes, never the parsed JSON. `WebhooksService` depends on two `@Optional()` ports: `INSTALLATION_SYNC` (real impl = F1.4 repo sync) and `EVENT_PUBLISHER` (real impl = outbox once `packages/db` lands); until then no org is mapped and publishes are skipped with a log. **Testing quirk:** vitest/esbuild does not emit decorator metadata, so DI in these classes uses explicit `@Inject(...)` tokens — do the same for anything you want to test through `Test.createTestingModule`. Webhook delivery-id dedupe is TODO with the DB wiring (api-and-versioning.md §6).

# Internal+public typed API: ts-rest (over tRPC)

- **Date:** 2026-07-06
- **Type:** decision (refines D4 / `api-and-versioning.md`)
- **Related:** supersedes the "tRPC internal / OpenAPI public" note in the backend-stack ADR

## Context
Building the NestJS controller layer surfaced a mismatch: the earlier plan was "tRPC for internal, OpenAPI for public." tRPC has its own router paradigm that fights NestJS's controller/DI model, and it would still require a *separate* OpenAPI definition for the public API — two sources of truth.

## Decision
Use **ts-rest** for both the internal and public typed API.
- Define one **contract** (zod + routes) in `packages/contracts`.
- NestJS controllers **implement** it with `@ts-rest/nest` (`@TsRestHandler` + `tsRestHandler`) — the native controller/handler system stays.
- The frontend gets a fully-inferred client with **no codegen** (`@ts-rest/core` `initClient`, used inside TanStack Query).
- Public **OpenAPI** is generated from the same contract (`@ts-rest/open-api`).

One contract → typed server + typed client + OpenAPI. Native NestJS controllers remain the router/handler layer.

## Why
- Fits NestJS (controllers implement contracts) instead of fighting it.
- Single source of truth for internal types, public OpenAPI, and the future SDK.
- Keeps end-to-end inference to the Next.js frontend (the reason we chose TS).

## Validation (this was built and run, not just typed)
- `GET /api/v1/system/info` (ts-rest contract on Fastify) returns `{"name":"agentgit","version":"0.0.0"}` at runtime.
- Full workspace typecheck (7/7) and build (6/6) pass.

## Consequences / quirks (now in `backend-structure.md`)
- `@ts-rest/core` must be a **direct** dep of `apps/api` (avoids `TS2742` under pnpm).
- Contract literals returned with `as const` to satisfy `z.literal`.
- Shared libs build to **CJS `dist`**; the CJS NestJS runtime consumes built output, not `.ts` source.
- `docs/conventions/api-and-versioning.md` updated (tRPC → ts-rest); the backend-stack ADR's "tRPC" mention is superseded by this.

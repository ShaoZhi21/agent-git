# Backend Structure Conventions (NestJS)

**Read before adding any endpoint, module, or provider in `apps/api`.** Governs how the control plane is organized. The scaffold (health module + a ts-rest reference endpoint) is live and verified — copy those patterns.

## Runtime & layout

NestJS on the **Fastify** adapter. Everything is served under `/api`; public versioned routes under `/api/v1/...`.

```
apps/api/src/
  main.ts                    bootstrap (Fastify, global prefix, global filter)
  app.module.ts              root module — imports feature modules + global interceptor
  config/                    validated env (zod) via @nestjs/config
  common/
    filters/                 all-exceptions -> RFC 9457 problem+json
    pipes/                   zod validation pipe (ad-hoc)
    interceptors/            logging + request-context (tenant/RLS)
  health/                    reference NATIVE module (controller + service)
  system/                    reference TS-REST module (contract-implemented controller)
  <feature>/                 one module per feature (auth, github, checkpoints, evals, ...)
```

## The module / controller / service pattern

Every feature is a **module** grouping its **controllers** (HTTP handlers) and **providers/services** (logic). Controllers stay thin — they delegate to services; services hold the logic and are injectable/testable.

```ts
@Module({ controllers: [HealthController], providers: [HealthService] })
export class HealthModule {}
```

Register new feature modules in `app.module.ts`.

## Two endpoint styles — pick by purpose

- **Infra / liveness endpoints → native Nest controllers** (`@Controller()`, `@Get()`). Example: `health/` → `GET /api/health`. No contract needed.
- **Feature / product endpoints → ts-rest contract, implemented by a Nest controller.** This is the default for anything the frontend or an external client calls. See [`api-and-versioning.md`](api-and-versioning.md). Reference: `system/system.controller.ts`:

```ts
@Controller()
export class SystemController {
  @TsRestHandler(systemContract)
  handler() {
    return tsRestHandler(systemContract, {
      info: async () => ({ status: 200, body: { name: 'agentgit' as const, version: '0.0.0' } }),
    });
  }
}
```
The route, input validation, and response type all come from the contract in `packages/contracts`.

## Request lifecycle (where cross-cutting lives)

`middleware → guards → interceptors (pre) → pipes → handler → interceptors (post) → exception filter`

| Concern | Where | Status |
|---|---|---|
| Auth (is there a valid session?) | **Guard** (`packages/auth`) | TODO F1 |
| Permission (`authorize()`) | **Guard** wrapping the authorize() layer | TODO F1 |
| Tenant/RLS context | **`RequestContextInterceptor`** — sets `app.current_org_id` per request | TODO F1 |
| Input validation | **ts-rest contract** (preferred) or `ZodValidationPipe` | ✅ |
| Logging | **`LoggingInterceptor`** (global) | ✅ (swap for OTel — D11) |
| Errors → HTTP | **`AllExceptionsFilter`** → `application/problem+json` | ✅ |
| Config | validated env (`config/env.ts`, zod) | ✅ |

Wire global providers via `APP_INTERCEPTOR` / `APP_GUARD` in `app.module.ts`, or `app.useGlobalFilters()` in `main.ts`.

## ⚠️ Implementation quirks (learned building the scaffold — follow these)

1. **Shared `@agent-git/*` libs build to CommonJS (`dist`), and the API consumes the built `dist`, not `.ts` source.** The NestJS runtime is CJS and cannot import TypeScript source. Each lib has `"main": "./dist/index.js"` + a `build` script; **run `pnpm build`** (Turbo builds libs before the app). Importing a lib as source → `ERR_MODULE_NOT_FOUND` at runtime.
2. **`@ts-rest/core` must be a *direct* dependency of `apps/api`** (not only via `@ts-rest/nest`). Without it, pnpm's nested layout triggers `TS2742: inferred type cannot be named` on `@TsRestHandler` methods.
3. **`fastify` must be a direct dependency** of `apps/api` for `FastifyReply`/`FastifyRequest` types (strict pnpm layout).
4. **Return contract literals with `as const`** (`name: 'agentgit' as const`) so they satisfy `z.literal(...)` in the contract's `responses`.
5. **NestJS uses CommonJS + decorator metadata.** `apps/api/tsconfig.json` sets `module: CommonJS`, `experimentalDecorators`, `emitDecoratorMetadata` — deliberately different from the ESM/Bundler base. Use **extensionless** relative imports here.
6. **`import 'reflect-metadata'` at the very top of `main.ts`** (required for DI metadata).
7. **The exception filter uses the Fastify reply** (`ctx.getResponse<FastifyReply>()`), not Express `res`.

## Testing
Vitest (`pnpm --filter @agent-git/api test`). Test services in isolation; test controllers via the Nest testing module.

## Verify it runs
```
pnpm build
PORT=3099 node apps/api/dist/main.js
curl localhost:3099/api/health              # {"status":"ok",...}
curl localhost:3099/api/v1/system/info      # {"name":"agentgit",...}
```

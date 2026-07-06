# packages/db — AGENTS.md

**Read before editing. Update "Structure"/"Notes" when the schema changes.**

## Purpose

The single source of truth for the database: Drizzle schema, migrations, and the typed client. Consumed by `apps/api` (and only the api — nothing else talks to Postgres directly).

## Non-negotiable rules (from [`docs/conventions/data-model.md`](../../docs/conventions/data-model.md))

- **Every tenant-scoped table:** `org_id UUID NOT NULL REFERENCES orgs(id)` + **RLS enabled** with a `current_setting('app.current_org_id')` policy.
- **Primary keys are UUIDv7** (not `gen_random_uuid()`).
- **Append-only:** `checkpoints`, `eval_runs`, `eval_cases`, `regressions` — insert-only, never `UPDATE`/`DELETE`. Plus an append-only `audit_log`.
- **Global (no org_id):** `orgs`, `users`, `identities` only. `installations` are tenant-scoped in F1 because each install belongs to an AgentGit org.
- Runtime uses the **app role** (RLS applies); migrations use the **owner role**.
- Migrations are forward-only and checked in; never edit a shipped migration.

## Structure (agent-maintained)

```
drizzle.config.ts       drizzle-kit config (schema + migrations path)
tsconfig.test.json      typecheck project for db tests and Vitest config
migrations/
  0000_init.sql         org/user/identity/membership/install/repo tables
  0001_rls.sql          app role + tenant RLS policies
src/
  index.ts              public exports
  client.ts             postgres.js + Drizzle client; tenant tx helper
  id.ts                 UUIDv7 `newId()`
  rls.ts                tenant-scoped table/policy helpers
  schema/
    orgs.ts
    users.ts
    identities.ts
    memberships.ts
    installations.ts
    repos.ts
    index.ts
test/
  id.test.ts
  rls.test.ts           real Postgres RLS integration tests
```

## Status

F1.1 implemented — tenancy/identity schema, migrations, app role, and RLS proof are in place. Later build steps add agents/checkpoints/evals and audit/outbox tables.

## Notes (agent-maintained)

- 2026-07-06 — scaffolded. Driver = `postgres` (postgres.js); confirm RLS session-var pattern works through it before relying on it.
- 2026-07-06 — F1.1 added `orgs`, `users`, `identities`, `memberships`, `installations`, and `repos`; `memberships`/`installations`/`repos` have `org_id` and RLS via `app.current_org_id`. `pnpm --filter @agent-git/db test` proves app-role cross-org isolation against real Postgres.
- 2026-07-06 — GitHub external IDs (`installations.id`, `repos.installation_id`, `repos.github_repo_id`) are Drizzle `bigint` columns mapped to TypeScript `bigint`; convert to strings at API boundaries rather than JS `number`.

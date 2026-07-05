# packages/db — AGENTS.md

**Read before editing. Update "Structure"/"Notes" when the schema changes.**

## Purpose
The single source of truth for the database: Drizzle schema, migrations, and the typed client. Consumed by `apps/api` (and only the api — nothing else talks to Postgres directly).

## Non-negotiable rules (from [`docs/conventions/data-model.md`](../../docs/conventions/data-model.md))
- **Every tenant-scoped table:** `org_id UUID NOT NULL REFERENCES orgs(id)` + **RLS enabled** with a `current_setting('app.current_org_id')` policy.
- **Primary keys are UUIDv7** (not `gen_random_uuid()`).
- **Append-only:** `checkpoints`, `eval_runs`, `eval_cases`, `regressions` — insert-only, never `UPDATE`/`DELETE`. Plus an append-only `audit_log`.
- **Global (no org_id):** `orgs`, `users`, `identities`, `installations` only.
- Runtime uses the **app role** (RLS applies); migrations use the **owner role**.
- Migrations are forward-only and checked in; never edit a shipped migration.

## Structure (agent-maintained)
```
src/
  index.ts        placeholder — exports schema + client (TODO F1)
  (schema/ , client.ts , migrations added per feature)
```

## Status
Scaffold — not implemented. First tables land with build steps 1–3.

## Notes (agent-maintained)
- 2026-07-06 — scaffolded. Driver = `postgres` (postgres.js); confirm RLS session-var pattern works through it before relying on it.

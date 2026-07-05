# Data Model Conventions

**Read before any database work.** Governs how every table is shaped and accessed. Locked 2026-07-06 (D1, D6, D8, audit). Amends spec §5 (adds `orgs` + `org_id` + RLS; changes IDs to UUIDv7; makes history append-only).

Decisions in force: **multi-tenancy = shared DB + `org_id` + Postgres RLS · ORM = Drizzle · IDs = UUIDv7 · history = append-only + audit log.**

---

## 1. Multi-tenancy (D1) — the non-negotiable

Every customer's data lives in **one shared database**, isolated by an `org_id` column and enforced by **Postgres Row-Level Security (RLS)**. RLS is the *backstop* that makes isolation a database guarantee, not a "did the dev remember the `WHERE`" hope.

**Rules:**
1. **Every tenant-scoped table has `org_id UUID NOT NULL REFERENCES orgs(id)`.** No exceptions among domain tables (agents, checkpoints, eval_runs, eval_cases, regressions, datasets, …).
2. **RLS is enabled on every tenant-scoped table**, with a policy that filters by the current org.
3. **Never derive `org_id` from client input.** It comes from the authenticated session → membership. Client-supplied org ids are ignored.
4. Application sets the tenant context once per request; queries don't hand-write `org_id` filters (RLS applies them), but you still *insert* `org_id` explicitly.

**Tenant context pattern** (per request, inside a transaction):
```sql
-- set by the API's request middleware, from the session's org
SELECT set_config('app.current_org_id', $1, true);  -- 'true' = transaction-scoped
```
```sql
-- RLS policy on each tenant table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agents
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

**Connect as a non-superuser** (the app role), because Postgres superusers/table owners bypass RLS. The migration/admin role is separate from the runtime role.

**Global (non-tenant) tables** — the only tables *without* `org_id`: `orgs`, `users`, `identities`. GitHub `installations` are tenant-scoped because they are connected to exactly one AgentGit org. Everything product-domain is tenant-scoped.

---

## 2. ORM (D6) — Drizzle

**Use Drizzle.** Chosen specifically because it's SQL-first and respects the RLS/session-variable pattern cleanly (Prisma tends to connect privileged and bypass RLS). Migrations via `drizzle-kit`.

- Schema lives in `packages/db` (shared). One Drizzle schema module per aggregate.
- Migrations are checked in, forward-only, reviewed. Never edit a shipped migration; add a new one.
- Raw SQL is fine for anything Drizzle makes awkward — we are not hiding from SQL.
- The runtime DB connection uses the **app role** (RLS applies); migrations use the **owner/admin role**.

---

## 3. Primary keys (D8) — UUIDv7

**All primary keys are UUIDv7.** Time-sortable (good index locality, chronological ordering) and globally unique. Generate in the app (a `uuidv7()` helper) or via DB default — pick one and be consistent; app-side is preferred so the ID exists before insert (needed for events/outbox).

- Column: `id UUID PRIMARY KEY` (value is UUIDv7).
- Do **not** use UUIDv4 (`gen_random_uuid()` from spec §5) or bigserial. External references (URLs, the `agentgit-json` payload) use these ids, so the format is effectively permanent.

---

## 4. Immutability & audit (audit decision)

AgentGit *is* the record — so the record is trustworthy by construction.

**Append-only (insert-only; never `UPDATE`/`DELETE`):** `checkpoints`, `eval_runs`, `eval_cases`, `regressions`. History is a stack of immutable rows.
- "Current state" is derived: the latest row, or an explicit pointer column (e.g., `agents.live_checkpoint_id`).
- Corrections happen by inserting a new row, never mutating an old one.

**Mutable config tables** (e.g., `agents` settings, `datasets` metadata) may be updated, but changes that matter are captured in the audit log.

**Audit log** — one append-only table, written on every meaningful state change:
```
audit_log(
  id UUID PK (uuidv7),
  org_id UUID NOT NULL,
  actor_type TEXT,        -- 'user' | 'system' | 'webhook'
  actor_id UUID,          -- user id or null
  action TEXT,            -- e.g. 'agent.updated', 'checkpoint.reverted'
  entity_type TEXT,
  entity_id UUID,
  before JSONB,           -- nullable
  after JSONB,            -- nullable
  created_at TIMESTAMPTZ DEFAULT now()
)
```
This doubles as the "who changed what" surface promised in spec F13, and overlaps naturally with the event stream (many audit entries have a corresponding event — see [`events.md`](events.md)).

**Soft-delete, never hard-delete** user-facing entities: use `deleted_at TIMESTAMPTZ`. History rows are never deleted (retention/archival is a separate, explicit Phase-2 process).

---

## 5. Standard columns

Every table:
- `id UUID PRIMARY KEY` (UUIDv7)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- tenant-scoped tables: `org_id UUID NOT NULL REFERENCES orgs(id)`
- mutable tables: `updated_at TIMESTAMPTZ`
- soft-deletable: `deleted_at TIMESTAMPTZ`

**Example** (Drizzle, tenant-scoped, append-only checkpoint):
```ts
export const checkpoints = pgTable('checkpoints', {
  id: uuid('id').primaryKey(),                 // UUIDv7, set in app
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  agentId: uuid('agent_id').notNull().references(() => agents.id),
  gitCommitSha: text('git_commit_sha').notNull(),
  promptHash: text('prompt_hash'),
  skillsSnapshot: jsonb('skills_snapshot'),
  toolsSnapshot: jsonb('tools_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // no updatedAt: checkpoints are immutable
});
// + RLS policy (see §1) applied in the migration
```

---

## 6. Relationship to the two access layers

Two independent guards, don't conflate them:
- **RLS (this doc)** = *tenant data isolation* — Org A can't see Org B's rows, period.
- **`authorize()` (see [`auth.md`](auth.md))** = *feature/role permissions within an org* — can this member edit this agent.

Both always apply. RLS is the database floor; `authorize()` is the application ceiling.

# F1 — One-click GitHub install (connect)

- **Spec ref:** docs/spec.md §7 F1 · **Phase:** 1 · **Target user:** Builder
- **Status:** in-progress
- **Sprint:** [sprint-01](../../sprints/sprint-01/) · **Depends on:** — (this is build step 1)

## Goal

A developer connects their agent's repo via a GitHub App in under 10 minutes, with zero code changes, so AgentGit can read it. This is the entire adoption thesis — friction here kills everything.

## Acceptance criteria

- [ ] User clicks "Connect GitHub", installs the App, picks repos, and is redirected back.
- [ ] `installations` + `repos` are persisted; repos enumerated via the installation.
- [ ] Webhooks (`push`, `pull_request`, `installation`, `installation_repositories`) are received and **HMAC-verified** (`X-Hub-Signature-256`).
- [ ] A short-lived installation token can be minted (App JWT → installation access token) and used to read repo contents.
- [ ] Login works via GitHub OAuth with an internal `user_id` + `identities` row (GitHub OAuth for login is kept **distinct** from the GitHub App for repo access).
- [ ] Without editing any code, the user lands on a dashboard ready to show detected agents (detection itself is F2).

## Conventions to read first

- [`docs/conventions/auth.md`](../../docs/conventions/auth.md) — identity boundary; internal `user_id`; GitHub as first provider.
- [`docs/conventions/security.md`](../../docs/conventions/security.md) — webhook signature verification; App private key handling; least-privilege scopes.
- [`docs/conventions/data-model.md`](../../docs/conventions/data-model.md) — `installations`/`repos` shape, RLS, UUIDv7.
- [`docs/conventions/api-and-versioning.md`](../../docs/conventions/api-and-versioning.md) — webhook + callback routes.

## Plan (write BEFORE coding)

_(fill in when the task starts — App registration, install/callback routes, token exchange, webhook receiver, OAuth login, minimal dashboard shell. Touches: `apps/api`, `packages/auth`, `packages/db`.)_

## Worklog (write AFTER each work session)

- 2026-07-06 — Feature folder seeded from spec §7 F1. Not started.
- 2026-07-06 — Starting F1.1 DB foundations in `packages/db`: write UUIDv7 + RLS tests first, then add Drizzle schema, DB client, migrations/app role, and package docs. Scope is schema + RLS only; no API/GitHub flow.
- 2026-07-06 — F1.1 complete: added Drizzle schema/client/migrations for org/user identity plus memberships/installations/repos, UUIDv7 `newId()`, tenant transaction helper, app-role RLS policies, and real Postgres RLS tests. `installations` are tenant-scoped per F1 plan; `docs/conventions/data-model.md` corrected to match. Next: F1.2 OAuth identity/session work.
- 2026-07-06 — Starting PR #2 review fixes in `packages/db`: make RLS tests honor `DATABASE_URL`, avoid resetting existing app-role credentials, add future-table default grants, typecheck tests, and map GitHub bigint IDs without JS number precision loss. Scope remains F1.1 only.
- 2026-07-06 — PR #2 review fixes complete: RLS test app-role URLs now reuse the configured database host/port, `0001_rls.sql` no longer rotates an existing `agentgit_app` password and grants default future-table privileges, GitHub IDs are typed as `bigint`, and package typecheck now includes DB tests.

## Out of scope

Agent/eval detection (F2), checkpoints (F3), any eval running. This feature only gets the repo connected and readable.

## Open questions

- Exact session mechanism (server-side sessions vs short JWT + refresh) — decide at build time, record in `changes/` if notable.
- Deploy-status detection (`is_live`) is best-effort and out of scope here (spec §11).

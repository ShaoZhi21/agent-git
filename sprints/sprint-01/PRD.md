# Sprint 01 PRD — Connect & Detect

> **The sync doc for the whole sprint.** Every PR below is small and independently vettable — implement and merge them **one at a time**, in order. Per-feature detail lives in `features/F1-github-connect/PLAN.md` and `features/F2-agent-detection/PLAN.md`. Follow the [`agentgit-feature-workflow`](../../.claude/skills/agentgit-feature-workflow/SKILL.md) skill for every PR.

**Goal:** A developer connects a repo via the GitHub App and — without editing any code — sees their detected agents in a dashboard. (Spec §10 build steps 1–2; features F1 + F2.)

**Architecture:** All work lands in the existing monorepo. The API (`apps/api`, NestJS+Fastify) gains auth, GitHub, and detection modules; `packages/db` (Drizzle) gains the schema with RLS; `packages/contracts` gains ts-rest contracts consumed by `apps/web`. Postgres + NATS run via `pnpm dev:infra`.

**Tech stack:** NestJS + Fastify · Drizzle + Postgres (RLS) · ts-rest · `@octokit/*` · NATS JetStream · Next.js · Vitest · Playwright.

## Global constraints (apply to every PR)

- **Read first:** the relevant `docs/conventions/*` before coding (data-model, auth, api-and-versioning, events, security, backend-structure).
- **Multi-tenancy:** every tenant-scoped table has `org_id` + RLS; runtime connects as the non-superuser app role. IDs are **UUIDv7**. History tables are append-only. (`data-model.md`)
- **Identity:** canonical internal `user_id`; providers map via `identities`; GitHub identity never leaks into domain tables. Every permission check goes through `authorize()`. (`auth.md`)
- **Contracts:** feature endpoints are ts-rest contracts in `packages/contracts`, implemented by NestJS controllers; public routes under `/api/v1`, versioned. (`api-and-versioning.md`, `backend-structure.md`)
- **Secrets:** never commit keys; GitHub App private key + webhook secret from env; verify webhook HMAC. (`security.md`)
- **No scope creep:** stay inside the PR; cross-check spec §8 non-goals.

## The PR roadmap (implement top-to-bottom)

| PR | Title | Delivers | Depends on |
|---|---|---|---|
| **F1.1** | DB foundations + RLS | Drizzle setup, tenancy/identity schema, migrations, app role, RLS proven | — |
| **F1.2** | Auth: identity + GitHub OAuth login | login flow, `user`/`identity`, sessions, `authorize()` skeleton, `/login` works | F1.1 |
| **F1.3** | GitHub App auth (JWT → installation token) | App JWT, installation-token exchange, Octokit factory | F1.1 |
| **F1.4** | Install flow + callback | connect → install → persist `installations` + `repos` | F1.2, F1.3 |
| **F1.5** | Webhook receiver (HMAC) + sync + first event | verified webhooks, `repos` sync, `installation.*` → outbox → NATS | F1.3, F1.4 |
| **F1.6** | Dashboard: connected repos | `GET /api/v1/repos` (RLS), `/dashboard` renders repos | F1.2, F1.4 |
| **F2.1** | Repo tree read + agent detection | scan default branch, heuristics → agent candidates | F1.3, F1.4 |
| **F2.2** | Persist agents + `agentgit.yaml` + dashboard | persist `agents` (RLS), yaml override, list on dashboard | F2.1, F1.6 |
| **F2.3** | Eval command detection | detect eval tool/command per agent | F2.2 |

**Sprint is done** when: connect a repo → OAuth login → agents auto-detected → shown on the dashboard, all under RLS, with the test pyramid below green in staging.

## Testing strategy (enforced per PR — smallest unit → E2E)

Every PR must land all applicable levels; **E2E is not optional** and must pass in the staging environment before merge.

1. **Unit** (Vitest, no I/O) — pure logic: detection heuristics, JWT construction, HMAC verification, identity find-or-create, `authorize()` rules, `agentgit.yaml` parsing.
2. **Integration** (Vitest + **real Postgres** via `pnpm dev:infra` or Testcontainers + **mocked GitHub** via `msw`/`nock`) — API endpoints, DB queries **through RLS** (assert cross-org isolation), webhook handling, token exchange.
3. **E2E** (**Playwright** against a running `web` + `api` + Postgres + NATS, GitHub OAuth/App mocked or a dedicated test App) — full user flows: login, connect, see repos, see detected agents.
4. **Staging** — the whole test pyramid runs in a deployed staging env (prod-like: real Postgres + NATS, mocked GitHub) as the pre-merge gate.

**Test-pyramid rule:** most tests are unit; fewer integration; a few high-value E2E. Every PR states its test cases up front (write them before implementing — see the workflow skill).

## Definition of Done (per PR)

- [ ] Tests written **before** implementation; unit + integration + (where a user-visible flow changed) E2E all green.
- [ ] E2E green in staging.
- [ ] Conventions honored (RLS, identity boundary, ts-rest, HMAC, UUIDv7).
- [ ] Feature worklog updated; any new decision → `changes/` ADR; touched `docs/` updated.
- [ ] Reviewer can approve this PR without needing the next one.

## Environments

- **Local:** `pnpm dev:infra` (Postgres+NATS) + `pnpm dev`.
- **Staging:** prod-like deploy; runs the full pyramid; GitHub mocked or a test GitHub App on a test org.
- **Production:** later — not in this sprint.

# F1 — One-click GitHub Install: Implementation Plan

> **For agentic workers:** Follow the [`agentgit-feature-workflow`](../../.claude/skills/agentgit-feature-workflow/SKILL.md) skill for each part. Each **Part = one PR**, independently reviewable. Steps use `- [ ]` for tracking. Implement parts in order.

**Goal:** Let a developer connect a repo via the GitHub App (no code changes) and land on a dashboard listing their connected repos — everything tenant-isolated by org.

**Architecture:** `packages/db` (Drizzle schema + RLS) → `apps/api` modules (`auth`, `github`, `repos`) implementing ts-rest contracts from `packages/contracts` → `apps/web` (login + dashboard). Events flow through the outbox → NATS.

**Tech stack:** Drizzle + Postgres (RLS) · NestJS + Fastify · ts-rest · `@octokit/app`/`@octokit/webhooks`/`@octokit/rest` · `jsonwebtoken` (App JWT) · NATS · Vitest · Playwright · `msw` (mock GitHub).

## Global constraints
Copied from [`../../sprints/sprint-01/PRD.md`](../../sprints/sprint-01/PRD.md) — read it. Key: UUIDv7 IDs · `org_id` + RLS on tenant tables · app role at runtime · identity boundary (`user_id`) · ts-rest contracts · verify webhook HMAC · tests before code, E2E must pass in staging.

---

## Part F1.1 — Database foundations + RLS (PR #1)

**Goal:** Drizzle wired to Postgres with the tenancy + identity schema, migrations, the non-superuser app role, and **proven** RLS isolation.

**Files:**
- Create: `packages/db/src/schema/{orgs,users,identities,memberships,installations,repos}.ts`, `packages/db/src/schema/index.ts`
- Create: `packages/db/src/client.ts` (postgres.js + drizzle, sets `app.current_org_id`), `packages/db/src/id.ts` (UUIDv7), `packages/db/src/rls.ts` (policy helpers)
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/migrations/0000_init.sql` (generated) + `packages/db/migrations/0001_rls.sql` (hand-written RLS + app role)
- Test: `packages/db/test/rls.test.ts`

**Interfaces (produces):**
- `newId(): string` — UUIDv7.
- `getDb(orgId?: string)` → a drizzle client; when `orgId` set, runs `SELECT set_config('app.current_org_id', $1, true)` per transaction.
- Tables: `orgs(id, name, created_at)`, `users(id, email, name, created_at)`, `identities(id, user_id, provider, provider_user_id, created_at)`, `memberships(id, user_id, org_id, role)`, `installations(id BIGINT PK, org_id, account_login, account_type, created_at)`, `repos(id, org_id, installation_id, github_repo_id, full_name, default_branch, created_at)`.
- Tenant-scoped (org_id + RLS): `installations`, `repos`, `memberships`. Global: `orgs`, `users`, `identities`.

**Test cases (write first):**
- Unit: `newId()` returns a v7 UUID (version nibble = 7), monotonic-ish.
- Integration (real Postgres): with `app.current_org_id = A`, selecting `repos` returns only org-A rows; inserting a repo with org B then querying as org A returns nothing. As the **app role** (not superuser), RLS is enforced.

**Steps:**
- [ ] Add deps: `drizzle-orm`, `postgres`, `uuidv7`; dev `drizzle-kit`. (`packages/db/package.json`)
- [ ] **Write failing test** `rls.test.ts`: connect as app role, set org A, insert repo(orgA) + repo(orgB) via superuser seed, assert org-A session sees only its row.
- [ ] Run: `pnpm --filter @agent-git/db test` → FAIL (schema/client missing).
- [ ] Implement `id.ts` (`uuidv7`), `schema/*` (Drizzle tables, `org_id` where tenant-scoped), `client.ts` (drizzle + per-tx `set_config`).
- [ ] Generate migration: `pnpm --filter @agent-git/db db:generate`. Hand-write `0001_rls.sql`: `CREATE ROLE agentgit_app LOGIN ...`, `ALTER TABLE repos ENABLE ROW LEVEL SECURITY`, `CREATE POLICY tenant ON repos USING (org_id = current_setting('app.current_org_id')::uuid)` (repeat for installations, memberships), grant the app role.
- [ ] Apply: `pnpm --filter @agent-git/db db:migrate` (against `pnpm dev:infra`).
- [ ] Run test → PASS.
- [ ] Update `packages/db/AGENTS.md` structure; worklog. Commit.

**Acceptance:** app-role session with a tenant context sees only its org's rows; migrations apply cleanly from empty.

**PR boundary:** schema + RLS only. No API yet.

---

## Part F1.2 — Auth: identity boundary + GitHub OAuth login (PR #2)

**Goal:** "Sign in with GitHub" → internal `user` + `identity` + session cookie; `authorize()` skeleton; `/login` and the middleware gate work.

**Files:**
- Create: `packages/auth/src/{authn,authz,session}.ts`
- Create: `apps/api/src/auth/{auth.module,auth.controller,auth.service,github-oauth.service}.ts`
- Modify: `apps/api/src/app.module.ts` (import AuthModule), `apps/web/middleware.ts` (real session check), `apps/web/app/login/page.tsx` (link to `/api/auth/github`)
- Test: `packages/auth/test/identity.test.ts`, `apps/api/test/auth.e2e.test.ts`, `apps/web` Playwright `e2e/login.spec.ts`

**Interfaces:**
- Consumes: `getDb`, `users`, `identities`, `memberships` (F1.1).
- Produces: `findOrCreateUser({provider, providerUserId, email, name}): Promise<{userId}>`; `authorize(subject:{userId,orgId}, action:string, resource?):void` (throws `ForbiddenError`); `createSession(userId)`/`readSession(req)` (httpOnly signed cookie carrying `userId` + active `orgId`).
- Routes (native controller, not ts-rest — auth handshake): `GET /api/auth/github` (redirect to GitHub OAuth), `GET /api/auth/github/callback` (exchange code → find-or-create → set session → redirect `/dashboard`), `POST /api/auth/logout`.

**Test cases (write first):**
- Unit: `findOrCreateUser` creates user+identity on first call; returns same `userId` on second call with same provider id; a second provider maps to the same user by email if present.
- Integration: `GET /callback?code=...` with mocked GitHub token+user → creates rows, sets a valid session cookie, 302 → `/dashboard`.
- E2E (Playwright, GitHub OAuth mocked): visit `/login` → click sign-in → lands authenticated on `/dashboard`; visiting `/dashboard` unauthenticated redirects to `/login`.

**Steps:** write the identity unit test → fail → implement `authn`/`session` → pass; write the callback integration test with `msw` mocking `github.com/login/oauth/access_token` + `api.github.com/user` → fail → implement `github-oauth.service` + controller → pass; wire `middleware.ts` to redirect when no session → E2E → pass. Update `auth.md`/`packages/auth/AGENTS.md` if the session mechanism differs from the doc; worklog; commit per green step.

**Acceptance:** login creates exactly one user + identity, sets a session, gates `/dashboard`. On first login, create a personal `org` + owner `membership` (so the user has a tenant).

**PR boundary:** OAuth login only — no GitHub App / repos yet.

---

## Part F1.3 — GitHub App auth: JWT → installation token (PR #3)

**Goal:** Mint a short-lived App JWT, exchange it for an installation access token, and produce an authenticated Octokit client — the primitive every repo read uses.

**Files:**
- Create: `apps/api/src/github/{github.module,app-auth.service,octokit.factory}.ts`
- Modify: `apps/api/src/config/env.ts` (add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, OAuth client id/secret)
- Test: `apps/api/test/app-auth.test.ts`

**Interfaces:**
- Consumes: config (F1.3 env).
- Produces: `appJwt(): string` (RS256, `iss=appId`, 10-min exp); `installationToken(installationId): Promise<{token, expiresAt}>` (cached until expiry); `octokitForInstallation(installationId): Promise<Octokit>`.

**Test cases (write first):**
- Unit: `appJwt()` decodes to a JWT with `iss=appId`, `exp` ~10 min out, signed by the test private key.
- Integration: `installationToken(123)` with mocked `POST /app/installations/123/access_tokens` returns the token and caches it (second call doesn't re-request within expiry).

**Steps:** deps `@octokit/rest`, `@octokit/app`, `jsonwebtoken` → write JWT unit test → fail → implement `app-auth.service` → pass → write token-exchange integration test (`msw`) → fail → implement exchange + cache + `octokit.factory` → pass. `security.md` note re: private-key handling; worklog; commit.

**Acceptance:** given valid App config, we can obtain an installation token and a working Octokit client. (Verified against mocked GitHub; real GitHub validated in staging in F1.4.)

**PR boundary:** auth primitive only — no install flow, no persistence.

---

## Part F1.4 — Install flow + callback (PR #4)

**Goal:** "Connect GitHub" → install the App → callback persists the `installation` and enumerates + stores its `repos` (org-scoped).

**Files:**
- Create: `apps/api/src/github/{install.controller,install.service}.ts`, `apps/api/src/repos/repos.service.ts`
- Create: `packages/contracts/src/github.contract.ts` (the connect-start endpoint)
- Test: `apps/api/test/install.e2e.test.ts`, `apps/web` `e2e/connect.spec.ts`

**Interfaces:**
- Consumes: `octokitForInstallation` (F1.3), `getDb`, `installations`, `repos`, session (F1.2).
- Produces: `GET /api/github/install` (auth'd → redirect to `https://github.com/apps/<app>/installations/new?state=<signed>`); `GET /api/github/callback?installation_id=&state=` (verify state → upsert installation for the caller's org → `octokit.paginate` installation repos → upsert `repos`). `RepoService.syncInstallationRepos(installationId, orgId)`.

**Test cases (write first):**
- Integration: callback with mocked `GET /installation/repositories` upserts one `installations` row (bound to the session's org) and N `repos` rows; idempotent on replay.
- E2E: authenticated user clicks "Connect GitHub" → (mocked install) → callback → `repos` exist for their org.

**Steps:** contract → failing integration test → implement install/callback + `syncInstallationRepos` (upsert, idempotent, org-scoped) → pass → E2E → pass. Handle the `state` (signed, CSRF) per `security.md`. Worklog; commit.

**Acceptance:** after connecting, the org has an `installations` row and its `repos`, isolated by RLS. Replaying the callback doesn't duplicate.

**PR boundary:** install + initial sync — webhooks are F1.5.

---

## Part F1.5 — Webhook receiver (HMAC) + sync + first event (PR #5)

**Goal:** Receive **verified** GitHub webhooks, keep `repos`/`installations` in sync, and emit the first domain event through the outbox → NATS.

**Files:**
- Create: `apps/api/src/github/webhooks.controller.ts` (raw-body + HMAC), `apps/api/src/github/webhooks.service.ts`
- Create: `packages/db/src/schema/outbox.ts` + migration; `apps/api/src/events/{outbox.service,relay.ts}.ts`; `packages/events/src/{envelope,schemas/installation-changed}.ts`
- Modify: Fastify raw-body config for the webhook route
- Test: `apps/api/test/webhooks.test.ts`, `apps/api/test/outbox.test.ts`

**Interfaces:**
- Consumes: `syncInstallationRepos` (F1.4), `getDb`.
- Produces: `POST /api/github/webhooks` (verify `X-Hub-Signature-256` HMAC over raw body → dispatch by event type); handlers for `installation`, `installation_repositories` (sync), `push`/`pull_request` (persist nothing yet — emit/log); `OutboxService.publish(event)` (insert into `outbox` in the same tx); `relay` (poll outbox → NATS JetStream). Event `agentgit.installation.changed` (envelope per `events.md`).

**Test cases (write first):**
- Unit: valid signature passes; tampered body/invalid signature → 401; missing signature → 401.
- Integration: an `installation_repositories.added` webhook adds a repo; the relay publishes `installation.changed` to a test NATS stream; a consumer receives it once (idempotent on redelivery).

**Steps:** raw-body + HMAC verify (write unit tests first) → implement → pass; outbox schema + migration; write the sync+publish integration test (test NATS from `dev:infra`) → implement handlers + outbox + relay → pass. Update `events.md` catalog; worklog; commit.

**Acceptance:** signed webhooks mutate state and emit a versioned event via the outbox; unsigned/invalid are rejected.

**PR boundary:** webhooks + the first event only. `push`/`pull_request` payloads are just routed (checkpoints are F3, later sprint).

---

## Part F1.6 — Dashboard: connected repos (PR #6)

**Goal:** The dashboard lists the org's connected repos, fetched through a typed contract under RLS.

**Files:**
- Create: `packages/contracts/src/repos.contract.ts` (`GET /v1/repos`), `apps/api/src/repos/repos.controller.ts` (ts-rest)
- Modify: `apps/web/app/(app)/dashboard/page.tsx` (fetch + render), add `apps/web/lib/api.ts` binding for the repos contract
- Test: `apps/api/test/repos.e2e.test.ts`, `apps/web` `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: session/org (F1.2), `repos` (F1.4).
- Produces: contract `repos.list → GET /api/v1/repos` returns `{ repos: {id, fullName, defaultBranch}[] }` scoped to the caller's org (RLS + `authorize('repo.read')`).

**Test cases (write first):**
- Integration: two orgs each with repos; `GET /api/v1/repos` as org A returns only A's repos (RLS-enforced through the endpoint, not just the DB).
- E2E: connect (mocked) → `/dashboard` shows the connected repos; a second org's user never sees them.

**Steps:** contract → failing integration (cross-org isolation) test → implement controller (query via `getDb(orgId)`) → pass → wire the dashboard page (Server Component or `useQuery`) → E2E → pass. Worklog; commit.

**Acceptance:** dashboard shows exactly the caller-org's repos; cross-org isolation holds at the HTTP layer.

**PR boundary:** repos list only — agent detection is F2.

---

## Self-review notes
- **Spec coverage (F1 acceptance):** install+callback (F1.4), token exchange (F1.3), webhook HMAC (F1.5), OAuth login distinct from App (F1.2 vs F1.3), dashboard without code changes (F1.6). ✅
- **Type consistency:** `getDb(orgId)`, `newId()`, `octokitForInstallation()`, `syncInstallationRepos()`, `authorize()`, `findOrCreateUser()` used consistently across parts.
- **Deferred (not F1):** checkpoints/evals; `is_live` deploy detection (spec §11).

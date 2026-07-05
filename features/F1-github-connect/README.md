# F1 — One-click GitHub install (connect)

- **Spec ref:** docs/spec.md §7 F1   · **Phase:** 1   · **Target user:** Builder
- **Status:** not-started
- **Sprint:** [sprint-01](../../sprints/sprint-01/)   · **Depends on:** — (this is build step 1)

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
- 2026-07-06 — **F1.3 started** (worktree `sprint01/f1-github-app`). Plan: tests-first for `appJwt()` (RS256, `iss=appId`, 10-min exp) and `installationToken()` (mocked GitHub via msw, cached until expiry), then implement `apps/api/src/github/{github.module,app-auth.service,octokit.factory}.ts` + env additions (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, OAuth client id/secret). Touches `apps/api` only — no DB dependency; runs parallel to F1.1. F1.5 follows in this worktree (outbox migration deferred until F1.1 merges).
- 2026-07-06 — **F1.3 done.** `GithubModule` with `AppAuthService` (`appJwt()` RS256 iss=appId, iat back-dated 60s, 10-min exp; `installationToken()` exchange, cached per installation with 60s pre-expiry refresh) and `OctokitFactory.octokitForInstallation()`. 8 tests green (JWT unit ×3, token exchange/caching integration ×4 via msw, authenticated Octokit ×1); typecheck + build + boot verified. Decisions: **`@octokit/rest` pinned v20** (v21+ pure-ESM vs CJS Nest build — noted in `apps/api/AGENTS.md`, no ADR: two-way door); PEM `\n`-escape normalization; native `fetch` for the token exchange. No E2E: no user-visible flow (per PRD DoD). Follow-ups: real-GitHub validation happens in staging at F1.4; `GITHUB_OAUTH_*` env added for F1.2's use. Next: F1.5 (webhooks + events backbone).

## Out of scope
Agent/eval detection (F2), checkpoints (F3), any eval running. This feature only gets the repo connected and readable.

## Open questions
- Exact session mechanism (server-side sessions vs short JWT + refresh) — decide at build time, record in `changes/` if notable.
- Deploy-status detection (`is_live`) is best-effort and out of scope here (spec §11).

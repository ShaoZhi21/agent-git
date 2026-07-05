# F2 — Agent & eval detection

- **Spec ref:** docs/spec.md §7 F2   · **Phase:** 1   · **Target user:** Builder
- **Status:** in-progress
- **Sprint:** [sprint-01](../../sprints/sprint-01/)   · **Depends on:** F1 (connected repo + installation token)

## Goal
Automatically figure out *what agents exist* in a connected repo and *how to evaluate each*, so the user sees their agents on the dashboard with (near-)zero config.

## Acceptance criteria
- [ ] On connect (and on `agentgit.yaml` presence), the default branch is scanned and agent candidates are detected via heuristics (SKILL.md dirs, framework imports, `agents/**`, prompt dirs).
- [ ] `agentgit.yaml` at repo root overrides/augments detection.
- [ ] Detected agents are persisted (`agents`, org-scoped + RLS) and shown on the dashboard for confirm/rename.
- [ ] For repos using a common eval tool (or `agentgit.yaml`), each agent's `eval_command` is detected.

## Conventions to read first
- [`docs/conventions/data-model.md`](../../docs/conventions/data-model.md) · [`docs/conventions/backend-structure.md`](../../docs/conventions/backend-structure.md) · [`docs/conventions/api-and-versioning.md`](../../docs/conventions/api-and-versioning.md)

## Plan
See [`PLAN.md`](PLAN.md) — broken into 3 iterative PRs.

## Worklog
- 2026-07-06 — Feature folder + plan seeded. Not started.
- 2026-07-06 — Starting F2.1 in `sprint01/detection-engine`: add a pure `packages/detect` agent-candidate engine with fixture-first Vitest coverage, plus an API `TreeService` that flattens mocked GitHub recursive tree responses. Scope is intentionally limited to detection candidates and repo tree read; no persistence, dashboard, or eval-command detection in this PR.
- 2026-07-06 — F2.1 implemented. Added `@agent-git/detect` with tests for `SKILL.md`, `agents/**`, `agent.yaml`, `prompts/**`, empty repos, multiple agents, and content-backed `langgraph` imports. Added API `TreeService` with a mocked GitHub recursive-tree test. Verification: `pnpm build` and `pnpm test` pass. No E2E added for this PR because F2.1 exposes no user-visible flow; F2.2 owns persistence/API/dashboard E2E.

## Out of scope
Checkpoints (F3), eval running (F4). F2.1 also excludes persistence, dashboard rendering, `agentgit.yaml`, and eval-command detection; those are F2.2/F2.3.

# F2 — Agent & eval detection

- **Spec ref:** docs/spec.md §7 F2   · **Phase:** 1   · **Target user:** Builder
- **Status:** not-started
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

## Out of scope
Checkpoints (F3), eval running (F4). Detection only persists metadata.

---
name: agentgit-feature-workflow
description: Use when implementing any AgentGit feature, PR, sprint task, or bugfix in this repo — before writing code.
---

# AgentGit Feature Workflow

## Overview

The mandatory loop for shipping code in AgentGit. **Tests are written before implementation; coverage runs smallest-unit → E2E; E2E must pass and be optimized; docs are updated in the same PR.** Work in **small, independently-vettable PRs** — never one massive feature at once.

This is a platform that tracks and manages the *lifecycle of other agents*, so our own lifecycle must be exemplary: nothing merges without a green test pyramid and current docs.

## The loop (every PR)

Do these in order. Each is a gate — don't advance until it's met.

1. **Orient (read).** Read the relevant [`docs/conventions/*`](../../docs/conventions/) for the area you're touching (data-model, auth, api-and-versioning, events, security, backend-structure, frontend-routing), the sprint PRD (`sprints/sprint-NN/PRD.md`), and **the specific PR/part** in the feature `PLAN.md`. Know the scope and the acceptance criteria before typing code.
2. **Write the tests first — smallest unit → E2E.** From the PLAN's "Test cases", write them **before** any implementation: **unit** (pure logic, no I/O) → **integration** (API + real Postgres through RLS + mocked GitHub) → **E2E** (Playwright over the running stack). Assert the acceptance criteria and cross-org isolation.
3. **RED.** Run the tests. Watch them fail for the right reason (missing code, not a broken test).
4. **Implement.** The minimal code to satisfy the tests and the PLAN. Follow the conventions exactly (RLS tenant context, `authorize()`, ts-rest contracts, UUIDv7, HMAC, outbox).
5. **GREEN, iteratively.** Run tests, fix, repeat until **all levels pass**. Do not weaken a test to make it pass.
6. **E2E gate (non-negotiable).** The E2E flow must pass in staging **and be optimized** — fast, deterministic, no arbitrary sleeps (use condition-based waits). If E2E is flaky or slow, fix it before merge.
7. **Document (same PR).** Update the feature **worklog** (what changed, decisions, follow-ups, status); write/refresh the **feature doc** and record **implementation reasoning**; update any **`docs/conventions/*`** whose rule changed; add a **`changes/` ADR** for any real decision or deviation.
8. **Vet.** The PR is small and self-contained — a reviewer can approve it without the next PR. Confirm against spec §8 non-goals.

## Test pyramid (what "good testing" means here)

| Level | Tool | Covers | Most/least |
|---|---|---|---|
| Unit | Vitest | pure functions: heuristics, JWT, HMAC, identity mapping, yaml parse, `authorize()` rules | **most** tests |
| Integration | Vitest + Postgres + `msw` | endpoints, DB **through RLS** (assert cross-org isolation), webhooks, token exchange | some |
| E2E | Playwright vs running stack | full flows: login → connect → detect → dashboard | **few, high-value — must pass in staging** |

Unit-heavy, a few E2E. Every level that applies to the PR must be green.

## Red flags — STOP

- About to write implementation with no failing test → **write the test first.**
- "I'll add the E2E later" → **no.** E2E is part of this PR.
- The PR touches many features / is huge → **split it** (see the feature `PLAN.md` parts).
- Docs not updated but behavior/convention changed → **update them in this PR.**
- Weakening/deleting a test to get green → **fix the code, not the test.**
- E2E passes but takes 90s with `sleep()` → **optimize it** (condition-based waits).

## Rationalizations → reality

| Excuse | Reality |
|---|---|
| "Tests after achieve the same thing" | Tests-first define *what should happen*; tests-after just describe what the code does. Write them first. |
| "E2E is slow, I'll skip it this PR" | E2E is the only proof the whole flow works. It's the gate, not an extra. |
| "One big PR is faster to write" | It's slower to *review and trust*. The point is iterative vetting — ship the PLAN's parts one by one. |
| "Docs can wait for a cleanup PR" | Stale docs mislead the next agent. Same-PR or it didn't happen. |
| "RLS/authorize can be added later" | Retrofitting isolation is a rewrite and a security hole. It's in the acceptance criteria. |

## Quick reference

`read conventions + PRD + PLAN → write tests (unit→integration→E2E) → RED → implement → GREEN → E2E green in staging → update worklog/docs/ADR → small PR`

> Note: this is a project-local workflow skill (authored to the structure of `superpowers:writing-skills`, not pressure-tested against subagents). It complements — does not replace — `superpowers:test-driven-development` and `superpowers:verification-before-completion`; use those for the underlying TDD/verification discipline.

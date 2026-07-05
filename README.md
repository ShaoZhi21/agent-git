<div align="center">

# AgentGit

**The system of record for a company's AI agents.**
Version every agent, catch silent regressions on every change, and always know whether each one still works.

`early / pre-release` · `Apache-2.0 (open-core)` · `self-hostable`

</div>

> **Working name.** "AgentGit" is a placeholder — think *GitHub for AI agents*. It may change.

---

## Why

Companies ship LLM-powered agents faster than they can manage them. A single org can already run ~100 across teams — overlapping, siloed, with no shared record of what exists, what each costs, or whether any of them still works. Most agent projects fail on the **operational layer** — versioning, evaluation, regression-catching, governance — not on model quality.

Two people feel two different pains:

- **The Builder** changes an agent's prompt, skills, tools, or logic — and has no reliable way to know they didn't make it *worse*. Agents regress **silently**; you find out from a user, or too late.
- **The Consumer** wants to reuse an agent another team built — but can't discover it, trust it, or tell if it's reliable, so they rebuild what already exists.

No product today owns **the record of what every agent is and whether it works**. AgentGit is that record — *the map* the rest of the tooling plugs into.

## What it does

Connect the repo your agents already live in (no rewrite). From then on, on every change, AgentGit:

1. **Checkpoints** the agent — an immutable snapshot of everything that defines its behavior (prompt · skills · tools · code) **plus its measured quality**.
2. **Evaluates** it and attaches the score to that checkpoint.
3. **Catches regressions** — flags when a change lowered quality and shows exactly which cases now fail.
4. **Diagnoses** — explains *why* it likely regressed and what to change, grounded in the diff and the failing traces.

Over time, those checkpoints become a searchable map of every agent an organization runs — with health, cost, and ownership.

## The core idea: the Checkpoint

Everything is built on one object. A **Checkpoint** is an immutable snapshot of an agent at a commit, capturing what it *is* (prompt, skills, tools, code) and how *good* it is (eval result, cost).

> This is what Git structurally can't give you: **a version that knows its own score.**

Every feature is one of: *produce* a checkpoint, *evaluate* one, *compare* two, or *reason about the delta* between two.

## How it works

```
  push / PR  ──►  checkpoint  ──►  run eval  ──►  score attached
                                                     │
                                        compare to last good
                                                     │
                                regression? ──►  which cases broke  +  why (diagnosis)
                                                     │
                                          surfaced on the PR & timeline
```

Evals run either in **your CI** (a lightweight GitHub Action posts results back) or in an **isolated hosted sandbox** — your choice, your keys.

## Roadmap

| Phase | Focus |
|---|---|
| **1 — Builder wedge** ← current target | Connect → quality timeline → catch a regression on a PR → get told why. |
| **2 — The map** | Org-wide agent registry, dependency/blast-radius graph, cost, teams & roles. |
| **3 — Front door** | Cross-team discovery, monitoring, orchestration, governance, enterprise. |

## Tech stack

**TypeScript end-to-end** across the web tier: Next.js frontend · NestJS + Fastify API · Drizzle + Postgres (row-level tenant isolation) · NATS JetStream (event bus + queue) · Octokit (GitHub App) · Anthropic (Claude) for diagnosis · a Python/FastAPI sandbox for hosted evals. All open source; the core is self-hostable by construction.

## Documentation

This repo is designed to be **AI-native** — optimized for heavy AI-assisted development.

| Where | What |
|---|---|
| [`docs/spec.md`](docs/spec.md) | The full technical specification — the source of truth. |
| [`docs/decisions.md`](docs/decisions.md) | Register of the heavy, one-way-door decisions and their status. |
| [`docs/conventions/`](docs/conventions/) | How we build: data model, API & versioning, events, auth, security. |
| [`docs/architecture.md`](docs/architecture.md) · [`docs/glossary.md`](docs/glossary.md) | System shape · domain vocabulary. |
| [`changes/`](changes/) | Dated decision records (ADRs). |
| [`CLAUDE.md`](CLAUDE.md) | Operating manual for AI coding agents in this repo. |

## Status

Early and pre-release. Foundations and architecture are locked; implementation is starting. There is no runnable product yet.

## License

Open-core: the core will be **Apache-2.0** and self-hostable; team/enterprise features are commercial. See [`changes/2026-07-06-open-core-self-host.md`](changes/2026-07-06-open-core-self-host.md).

# packages/detect — AGENTS.md

**Read before editing. Keep this package pure and fixture-tested.**

## Purpose
Pure TypeScript heuristics for scanning a repository tree and returning agent candidates. This package performs no GitHub, database, API, filesystem, or network I/O; callers provide the tree entries.

## Rules
- Keep exported functions deterministic and side-effect free.
- Test heuristics with small fixtures before wiring them into the API.
- Return candidates with explainable `signals` so the dashboard can show why AgentGit guessed an agent.
- `agentgit.yaml` parsing, persistence, and eval-command detection are later F2 parts; do not mix them into the F2.1 candidate detector.

## Structure
```
src/
  index.ts      public exports
  agents.ts     candidate grouping and public `detectAgents`
  signals.ts    low-level path/content signal extraction
test/
  agents.test.ts
```

## Status
F2.1 implemented: `detectAgents(tree)` detects candidates from `SKILL.md`, `agents/**`, `agent.yaml`, `prompts/**`, `*.agent.py`, and optional framework-import content.

## Notes
- 2026-07-06 — Package added for F2.1. Tree entries may include optional `content` for framework import detection; path-only scans still work, which matches the initial GitHub recursive tree read.

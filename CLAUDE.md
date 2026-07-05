# CLAUDE.md

**This repo uses [`AGENTS.md`](AGENTS.md) as the single canonical guide for all AI agents.** Read it first — it holds the mental model, the read-before/write-after working loop, the repo map, the locked stack/decisions, conventions, and guardrails.

This file exists only because Claude Code looks for `CLAUDE.md`. There is no separate guidance here — everything lives in `AGENTS.md` to avoid drift.

Two things worth repeating because they matter every time:
- **Read before, write after.** Before coding: read `AGENTS.md` → current `sprints/` → the `features/F<n>-*/` doc → relevant `docs/conventions/*` → the target folder's `AGENTS.md`. After coding: update the feature worklog, the folder `AGENTS.md`, `changes/` (if a decision), and any `docs/` that changed.
- **Commits/PRs:** clean messages, authored by the user. **Never** add AI/Claude co-author or "Generated with" trailers.

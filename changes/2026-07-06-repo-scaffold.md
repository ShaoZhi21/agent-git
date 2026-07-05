# Repo scaffold + spec captured

- **Date:** 2026-07-06
- **Type:** change
- **Related:** whole repo; `docs/spec.md`

## Context
Starting the project. Needed a home for the technical specification and an AI-native working structure before any code, so heavy AI-assisted coding has a clean, documented substrate to build on.

## Decision / Change
- Created the repo under a placeholder working name, **AgentGit** ("GitHub for AI agents").
- Captured the full technical spec verbatim at `docs/spec.md` — the source of truth.
- Set up five AI-native knowledge surfaces: `docs/` (reference), `features/` (forward-looking specs), `changes/` (this log), `.claude/skills/`, `.claude/agents/`, `.claude/memory/`.
- Wrote `README.md` (project pitch) and `CLAUDE.md` (operating manual for AI agents), plus `docs/glossary.md` and `docs/architecture.md`.
- No product code yet — intentional. Features to be vetted before building.

## Why
The user codes heavily with AI. An AI-native repo front-loads the context an agent needs (spec, glossary, conventions, where things live) so every session starts aligned instead of re-deriving intent. Keeping the spec canonical and separate from code prevents drift.

## Consequences
- `docs/spec.md` is the reference all work flows from; deviations get logged here.
- Build order and phasing discipline are documented (spec §10, `CLAUDE.md`) — Phase 1 first, gated on the §1.4 assumption.
- Next steps are the user's call: validate the core assumption (Phase 0) and/or begin build step 1 (GitHub App skeleton, F1).

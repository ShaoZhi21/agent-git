# changes/

Backward-looking record — **dated change & decision entries** (lightweight ADR style). This is the repo's memory of *what happened and why*. In an AI-native repo this is high-value: it lets a fresh AI session reconstruct intent without re-deriving it.

## When to add an entry

- After a meaningful change (a feature slice landed, a schema changed, a dependency added).
- After a **decision** worth preserving the reasoning for (chose X over Y, deviated from the spec, resolved an open question).
- After deviating from `docs/spec.md` — always record why.

Small mechanical edits don't need an entry. Anything future-you would ask "why did we do it this way?" about does.

## Convention

- **Filename:** `YYYY-MM-DD-<kebab-slug>.md` — e.g. `2026-07-06-repo-scaffold.md`.
- Newest at the top when listed. One decision/change per file keeps them linkable.

## Template

```markdown
# <title>

- **Date:** YYYY-MM-DD
- **Type:** <decision | change | spec-amendment>
- **Related:** <F# / files / spec §>

## Context
<what prompted this>

## Decision / Change
<what we did>

## Why
<the reasoning; alternatives considered>

## Consequences
<what this enables or constrains going forward>
```

> If a change amends intent in `docs/spec.md`, update the spec **and** log the amendment here.

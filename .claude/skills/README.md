# .claude/skills/

Project-specific **skills** for AI coding agents working in this repo — codified, repeatable workflows Claude Code can invoke. Empty for now; add skills as repeatable patterns emerge.

## What belongs here

A skill is worth writing when a workflow is (a) repeatable, (b) has a right way to do it that's easy to get wrong, and (c) will recur. Examples that may earn a skill as AgentGit grows:

- `add-eval-adapter` — the exact steps to add support for a new eval tool's output format (normalize to `agentgit-json`, register, test against a fixture). See spec §7 F4.
- `add-migration` — how to add a Postgres migration consistent with the schema in spec §5.
- `new-agent-fixture` — scaffold a realistic connected-repo fixture for testing detection (F2) and checkpointing (F3).

Don't pre-create these — write one the first time you do the task twice.

## Convention

Each skill is a directory with a `SKILL.md`:

```
.claude/skills/<skill-name>/SKILL.md
```

`SKILL.md` frontmatter:

```markdown
---
name: <skill-name>
description: Use when <trigger> — <what it does>.
---

<step-by-step instructions the agent follows exactly>
```

Keep skills tight and action-oriented. If a global superpowers skill already covers it (TDD, systematic-debugging, writing-plans), use that instead of duplicating — reserve this folder for AgentGit-specific knowledge.

> See the global `skill-creator` / `writing-skills` skills for authoring guidance.

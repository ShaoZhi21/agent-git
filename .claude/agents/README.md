# .claude/agents/

Project-specific **subagent** definitions for this repo. Empty for now; add subagents when a specialized, reusable role would help.

## What belongs here

A custom subagent is worth defining when a task recurs, benefits from a focused system prompt + tool set, and is better run in isolation. Candidates as AgentGit grows:

- `eval-adapter-writer` — specializes in reading a third-party eval tool's output and producing a tested adapter to `agentgit-json`.
- `schema-guardian` — reviews any DB change against the data model in `docs/spec.md` §5 and flags drift.
- `spec-alignment-reviewer` — checks a diff against the spec + §8 non-goals before merge.

Don't pre-create these — add one when the need is concrete.

## Convention

Each subagent is a Markdown file with frontmatter (same format the Agent tool reads):

```markdown
---
name: <agent-name>
description: <when to use this agent — be specific about triggers>
tools: <comma-separated tool list, or omit for default>
model: <sonnet | opus | haiku | inherit — optional>
---

<the agent's system prompt: role, what it does, how it reports back>
```

Keep each agent's scope narrow and its output contract explicit (what it returns to the caller).

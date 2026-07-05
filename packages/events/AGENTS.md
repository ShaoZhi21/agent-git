# packages/events — AGENTS.md

**Read before editing. Events are long-lived cross-service contracts.**

## Purpose
The event **envelope** and the versioned schema for each event type on NATS JetStream. One source of truth for producers (`apps/api`) and every consumer.

## Non-negotiable rules (from [`docs/conventions/events.md`](../../docs/conventions/events.md))
- **One envelope** (CloudEvents-style): `id`, `type`, `source`, `subject`, `time`, `version`, `orgid`, `data`.
- **`type` = `agentgit.<entity>.<action>`** (past tense). Subjects: `agentgit.<org_id>.<entity>.<action>`.
- **Outbox pattern** for publishing (write event in the same DB tx; a relay publishes).
- **Consumers idempotent** — dedupe on envelope `id`; at-least-once delivery.
- Additive within a version; breaking payload change → new `dataschema` version.

## Structure (agent-maintained)
```
src/
  index.ts        placeholder (TODO: envelope + schemas)
  (envelope.ts , schemas/<type>.ts , catalog per feature)
```

## Status
Scaffold — not implemented. First events land with build step 3 (F3) onward.

## Notes (agent-maintained)
- 2026-07-06 — scaffolded.

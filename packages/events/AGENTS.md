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
  index.ts        public exports — importing a schema module here REGISTERS it
  envelope.ts     envelope zod schema · defineEvent() · parseEvent() · natsSubject()
  schemas/
    installation-changed.ts   installation.changed/v1 (F1.5)
test/             Vitest (pure — no I/O)
```

## How to add an event
1. New module in `src/schemas/<entity>-<action>.ts`: a zod payload schema + `defineEvent({entity, action, version, schema, subject})`.
2. Export it from `src/index.ts` (this registers the dataschema for `parseEvent`).
3. Add the row to the `events.md` §7 catalog. Producers call the definition's `make()`; never build envelopes by hand.

## Status
Envelope + registry live; first event schema is `installation.changed/v1`. Checkpoint/eval/regression events land with F3+.

## Notes (agent-maintained)
- 2026-07-06 — scaffolded.
- 2026-07-06 — F1.5: envelope (CloudEvents-style, zod), `defineEvent()` factory (registers dataschema, generates UUIDv7 ids, builds tenant-first NATS subjects), consumer-side `parseEvent()` (envelope + payload validation, rejects unknown types), `installation.changed/v1`. 13 tests. Envelope `id`s use the `uuidv7` package directly (self-contained — this package must not depend on `packages/db`).

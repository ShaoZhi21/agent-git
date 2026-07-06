# Event Conventions

**Read before publishing or consuming anything on the bus.** Locked 2026-07-06 (D5). Transport is **NATS JetStream** (see [`../../changes/2026-07-06-event-bus-nats.md`](../../changes/2026-07-06-event-bus-nats.md)). The rule: **every event uses one versioned envelope, publishes via the outbox, and every consumer is idempotent.**

---

## 1. The envelope (CloudEvents-style)

Every event, without exception, is wrapped in:
```jsonc
{
  "specversion": "1.0",
  "id": "<uuidv7>",                     // unique per event; consumers dedupe on this
  "type": "agentgit.regression.detected",
  "source": "agentgit/api",            // producing service
  "subject": "agent/<agent_id>",       // the entity the event is about
  "time": "2026-07-06T12:00:00Z",
  "datacontenttype": "application/json",
  "orgid": "<uuidv7>",                  // tenant — used for routing + filtering (extension attr)
  "dataschema": "regression.detected/v1",
  "data": { /* typed payload, see §3 */ }
}
```
- `id` is the idempotency key — carry it through processing.
- `orgid` is mandatory (multi-tenant routing/filtering); it mirrors the domain row's `org_id`.

## 2. `type` naming

`agentgit.<entity>.<action>` — past-tense action (events are facts that already happened):
- `agentgit.checkpoint.created`
- `agentgit.eval.requested` · `agentgit.eval.completed`
- `agentgit.regression.detected`
- `agentgit.diagnosis.requested` · `agentgit.diagnosis.ready`
- `agentgit.agent.changed`

## 3. Subjects (NATS)

Hierarchical, tenant-first, so consumers can subscribe with wildcards:
```
agentgit.<org_id>.<entity>.<action>
  e.g.  agentgit.<org_id>.regression.detected
        agentgit.<org_id>.eval.completed
```
- A per-org monitor subscribes `agentgit.<org_id>.>`.
- A global regression handler subscribes `agentgit.*.regression.detected`.
- Streams group by entity; consumers are **durable pull consumers**, one per feature/handler.

## 4. Schema registry

- Every event `type` + version has a **zod schema** in `packages/events`, plus a generated JSON Schema.
- Producers construct via the schema (no ad-hoc object literals); consumers **validate on receive**.
- **Versioning:** additive fields are fine within a version. A breaking payload change = a new `dataschema` version (`regression.detected/v2`); publish both during the migration window, or a new `type`. Never break a shape a consumer relies on. (Same discipline as external API — see [`api-and-versioning.md`](api-and-versioning.md).)

## 5. The outbox pattern (mandatory for producers)

NATS can't enlist in a Postgres transaction, so to publish atomically with a state change:

1. In the **same DB transaction** as the domain write, insert the event into an `outbox` table (`id`, `type`, `subject`, `payload`, `created_at`, `published_at NULL`).
2. A **relay** process polls unpublished rows (or uses `LISTEN/NOTIFY`), publishes to JetStream, and marks `published_at`.
3. Publishing is **at-least-once** → duplicates happen → consumers must dedupe.

This gives "the event fires iff the DB change committed," with no dual-write hole.

```
domain write ─┐ (one tx)
outbox insert ─┘ ──► relay ──► NATS JetStream ──► durable consumers (idempotent)
```

## 6. Consumer rules

- **Idempotent, always.** Dedupe on envelope `id` (e.g., an `processed_events` table or a store check) before acting.
- **Ack after success**; on failure let JetStream redeliver (with backoff / max-deliver → DLQ subject).
- **One durable consumer per logical handler** (PR-comment poster, notifier, diagnosis trigger, dashboard projector, blast-radius recompute).
- Consumers set tenant context from `orgid` before any DB access (RLS — see [`data-model.md`](data-model.md)).

## 7. Initial event catalog

| Event | Emitted when | Key consumers |
|---|---|---|
| `installation.changed` | GitHub App installation created/removed/suspended or repo grant changed (F1.5) | repo-sync projections, audit |
| `checkpoint.created` | push/PR processed (F3) | eval trigger, timeline projector |
| `eval.completed` | eval result ingested (F4) | regression detector, timeline |
| `regression.detected` | eval worse than baseline (F6) | PR comment, notifier, diagnosis trigger, blast-radius |
| `diagnosis.ready` | diagnosis agent finished (F8) | PR comment update, notifier |
| `agent.changed` | agent config/skills/tools changed | blast-radius recompute, audit |

Add new events by adding a schema to `packages/events` + a row here — never by inventing an un-schema'd type.

# Event bus: NATS JetStream (over BullMQ / RabbitMQ / Kafka)

- **Date:** 2026-07-06
- **Type:** decision (refines `2026-07-06-backend-stack-decision.md`)
- **Related:** spec §3, §7 F4; supersedes the "BullMQ on Redis" line in the backend-stack ADR

## Context
The backend-stack ADR provisionally listed **BullMQ on Redis** as the queue, with a flag that BullMQ is Node-only on the wire and can't be consumed by the Python eval workers. That flag prompted a rethink: if the queue can't span languages, is it the right choice at all? Priority throughout: **sustainable long-term, avoid a future migration, clean open source, low ops for a small team.**

## Two reframes that drove the decision
1. **Cross-language is a non-requirement.** The Mode B eval sandbox runs *untrusted* user code — it must not hold bus/DB credentials. The secure design mirrors Mode A: the sandbox runs the eval and **POSTs results back to `/api/eval-runs` over authenticated HTTP**. So no non-TS service ever consumes the bus. "Does the queue speak Python" stops mattering.
2. **AgentGit is event-driven, not a job-runner.** The core facts — `checkpoint.created`, `eval.completed`, `regression.detected`, `agent.changed` — are events that *many* features subscribe to (PR comments, notifications, diagnosis, dashboard updates, blast-radius recompute, cross-team monitoring). That's a **message bus** (pub/sub, fan-out), and a job queue is just the one-consumer special case. Pick the bus.

## Producers (entry points onto the bus)
1. **GitHub webhook receiver** — repo push/PR/install events; must 200 GitHub fast, so it publishes and returns.
2. **Eval-result callback** (`/api/eval-runs`) — Mode A CI + Mode B sandboxes POST over HTTP; API emits `eval.completed`. Executors never touch the bus.
3. **Control-plane logic** — emits the derived chain: `checkpoint.created → eval.requested → eval.completed → regression.detected → diagnosis.requested`.
4. **User actions** (frontend → API) — run eval, rewind, regenerate diagnosis, confirm dataset row.
5. **Scheduler / cron** — re-eval blast-radius dependents, retention cleanup, cost/health rollups.

## Options evaluated (NATS vs RabbitMQ vs Kafka)
| Dimension (for us) | NATS JetStream | RabbitMQ | Kafka |
|---|---|---|---|
| Ops burden (small team) | Low (1 binary) | Medium | High |
| Job-queue semantics | Good | Best | Weak (not a task queue) |
| Event fan-out / pub-sub | Native | OK (fanout exch) | Native |
| Durable replay / retention | Good | Bolted-on (Streams) | Best |
| Polyglot TS/Py/Go clients | First-class | First-class | Java-first |
| Clean OSS license | Apache-2.0 | MPL-2.0 | Apache core ✓; Redpanda=BSL, Confluent=non-OSI |
| One system = queue + stream | Yes | Mostly | No (need a queue too) |
| Fit at our volume | Right-sized | Right-sized | Overkill |

- **Kafka — ruled out** as the backbone: overkill for control-plane volume, weak task-queue semantics (would force running Kafka *plus* a queue), and the clean-OSS build (vanilla Apache Kafka) is the heaviest to operate. Reconsider only as a targeted sink if Phase 3 trace-ingest becomes genuine high-volume streaming.
- **RabbitMQ — safe fallback:** most mature, richest queue semantics, but broker-thinking (point-to-point first), heavier ops than NATS, and you'd likely still want a real stream later.

## Decision
**NATS JetStream** as the single messaging backbone (job queue **and** event stream): one lightweight binary, first-class TS/Python/Go clients, durable streams + at-least-once (+ publish dedup for effectively-once), Apache-2.0 / CNCF. It covers both our job and fan-out needs in one low-ops, cleanly-licensed system that scales up without a rewrite.

Two accompanying design points:
- **Outbox pattern for transactional publishes.** NATS doesn't do XA with Postgres, so to publish atomically with a domain write: write the event to an `outbox` table in the same DB transaction, and a small relay publishes it to NATS. Standard, robust; recovers the one property pg-boss would have given for free.
- **Mode B = HTTP-callback sandboxes.** The eval sandbox POSTs results back over HTTP; it is not a bus consumer. Keeps untrusted code off the bus and unifies Mode A and Mode B into the same "executor runs eval → POSTs results" shape.

## Consequences
- Replaces "BullMQ on Redis" everywhere (architecture.md, CLAUDE.md, backend-stack ADR updated). **Redis/Valkey is no longer required** for the MVP (revisit only if we later want it for caching / GitHub-API rate-limiting).
- Subjects are event-shaped (e.g. `agent.<id>.regression`), consumers are durable pull consumers per feature.
- The earlier "Python only behind the queue" principle becomes **"Python only inside HTTP-callback eval sandboxes."**
- Open: exactly which streams/subjects + retention policy; decide when the first consumers are built (F6/F8).

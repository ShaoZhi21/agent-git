// @agent-git/events — the event envelope + versioned per-type schemas.
//
// Read ../../docs/conventions/events.md BEFORE adding events.
// Every event uses the CloudEvents-style envelope (id, type, source, subject,
// time, version, orgid, data), is published via the OUTBOX pattern, and every
// consumer is idempotent (dedupe on envelope id).
//
// TODO(F3+): define the envelope + schemas for checkpoint.created, eval.completed,
//            regression.detected, diagnosis.ready, agent.changed.
export {};

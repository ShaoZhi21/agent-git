// @agent-git/events — the event envelope + versioned per-type schemas.
//
// Read ../../docs/conventions/events.md BEFORE adding events.
// Every event uses the CloudEvents-style envelope, is published via the
// OUTBOX pattern, and every consumer is idempotent (dedupe on envelope id).
//
// Adding an event = a schema module under src/schemas/ (registered via
// defineEvent) + a row in the events.md catalog. Importing it here is what
// registers it for parseEvent.

export {
  EVENT_SOURCE,
  eventEnvelopeSchema,
  natsSubject,
  defineEvent,
  parseEvent,
  type EventEnvelope,
  type EventDefinition,
} from './envelope';

export {
  installationChanged,
  installationChangedV1,
  makeInstallationChanged,
  type InstallationChangedV1,
} from './schemas/installation-changed';

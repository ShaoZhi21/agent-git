import { z } from 'zod';
import { uuidv7 } from 'uuidv7';

// The one CloudEvents-style envelope every event uses (events.md §1).
// `id` is the consumer-side idempotency key; `orgid` is mandatory for
// multi-tenant routing and mirrors the domain row's org_id.

export const EVENT_SOURCE = 'agentgit/api';

const TYPE_PATTERN = /^agentgit\.[a-z_]+\.[a-z_]+$/;
const DATASCHEMA_PATTERN = /^[a-z_]+\.[a-z_]+\/v\d+$/;

export const eventEnvelopeSchema = z.object({
  specversion: z.literal('1.0'),
  id: z.string().uuid(),
  type: z.string().regex(TYPE_PATTERN, 'type must be agentgit.<entity>.<action>'),
  source: z.string().min(1),
  subject: z.string().min(1),
  time: z.string().datetime(),
  datacontenttype: z.literal('application/json'),
  orgid: z.string().uuid(),
  dataschema: z
    .string()
    .regex(DATASCHEMA_PATTERN, 'dataschema must be <entity>.<action>/v<N>'),
  data: z.unknown(),
});

export type EventEnvelope<TData = unknown> = Omit<
  z.infer<typeof eventEnvelopeSchema>,
  'data'
> & { data: TData };

// Tenant-first NATS subject hierarchy (events.md §3):
// agentgit.<org_id>.<entity>.<action>
export function natsSubject(orgId: string, entity: string, action: string): string {
  return `agentgit.${orgId}.${entity}.${action}`;
}

// Registry of every known dataschema -> payload schema. Consumers validate
// on receive; an event type that isn't registered here doesn't exist
// (events.md §7: "never invent an un-schema'd type").
const registry = new Map<string, z.ZodTypeAny>();

export interface EventDefinition<S extends z.ZodTypeAny> {
  entity: string;
  action: string;
  version: number;
  schema: S;
  /** CloudEvents `subject` — the entity the event is about, e.g. installation/123 */
  subject: (data: z.infer<S>) => string;
}

// Producers construct events ONLY through the definition returned here —
// no ad-hoc object literals (events.md §4).
export function defineEvent<S extends z.ZodTypeAny>(def: EventDefinition<S>) {
  const type = `agentgit.${def.entity}.${def.action}`;
  const dataschema = `${def.entity}.${def.action}/v${def.version}`;
  registry.set(dataschema, def.schema);

  return {
    type,
    dataschema,
    schema: def.schema,
    natsSubject: (orgId: string) => natsSubject(orgId, def.entity, def.action),
    make(opts: { orgId: string; data: z.infer<S> }): EventEnvelope<z.infer<S>> {
      const data = def.schema.parse(opts.data);
      return {
        specversion: '1.0',
        id: uuidv7(),
        type,
        source: EVENT_SOURCE,
        subject: def.subject(data),
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        orgid: opts.orgId,
        dataschema,
        data,
      };
    },
  };
}

// Consumer-side validation: envelope first, then the payload against its
// declared dataschema. Throws on unknown types and shape mismatches.
export function parseEvent(raw: unknown): EventEnvelope {
  const envelope = eventEnvelopeSchema.parse(raw);
  const schema = registry.get(envelope.dataschema);
  if (!schema) {
    throw new Error(`Unknown event dataschema: ${envelope.dataschema}`);
  }
  return { ...envelope, data: schema.parse(envelope.data) };
}

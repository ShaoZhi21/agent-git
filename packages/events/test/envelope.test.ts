import { describe, expect, it } from 'vitest';
import {
  eventEnvelopeSchema,
  natsSubject,
  parseEvent,
} from '../src/index';
import {
  installationChangedV1,
  makeInstallationChanged,
} from '../src/schemas/installation-changed';

const ORG_ID = '01920000-0000-7000-8000-000000000001';

function validEvent() {
  return makeInstallationChanged({
    orgId: ORG_ID,
    data: {
      installationId: 123,
      accountLogin: 'acme',
      accountType: 'Organization',
      action: 'created',
      repos: [{ githubRepoId: 99, fullName: 'acme/demo' }],
    },
  });
}

describe('event envelope (events.md §1)', () => {
  it('a constructed event satisfies the envelope schema', () => {
    const event = validEvent();
    expect(() => eventEnvelopeSchema.parse(event)).not.toThrow();
    expect(event.specversion).toBe('1.0');
    expect(event.datacontenttype).toBe('application/json');
    expect(event.source).toBe('agentgit/api');
  });

  it('generates a UUIDv7 id, unique per event', () => {
    const a = validEvent();
    const b = validEvent();
    expect(a.id).not.toBe(b.id);
    // version nibble of a UUIDv7 is '7'
    expect(a.id[14]).toBe('7');
  });

  it('type follows agentgit.<entity>.<action> and subject is the entity ref', () => {
    const event = validEvent();
    expect(event.type).toBe('agentgit.installation.changed');
    expect(event.subject).toBe('installation/123');
    expect(event.dataschema).toBe('installation.changed/v1');
  });

  it('orgid is mandatory and must be a UUID', () => {
    const event = validEvent();
    expect(event.orgid).toBe(ORG_ID);
    expect(() =>
      eventEnvelopeSchema.parse({ ...event, orgid: undefined }),
    ).toThrow();
    expect(() =>
      eventEnvelopeSchema.parse({ ...event, orgid: 'not-a-uuid' }),
    ).toThrow();
  });

  it('rejects a type that does not match agentgit.<entity>.<action>', () => {
    const event = validEvent();
    expect(() =>
      eventEnvelopeSchema.parse({ ...event, type: 'installation-changed' }),
    ).toThrow();
  });

  it('time is a valid ISO timestamp', () => {
    const event = validEvent();
    expect(new Date(event.time).toISOString()).toBe(event.time);
  });
});

describe('NATS subjects (events.md §3 — tenant-first)', () => {
  it('builds agentgit.<org_id>.<entity>.<action>', () => {
    expect(natsSubject(ORG_ID, 'installation', 'changed')).toBe(
      `agentgit.${ORG_ID}.installation.changed`,
    );
  });

  it('a constructed event carries its NATS subject', () => {
    const event = validEvent();
    expect(natsSubject(event.orgid, 'installation', 'changed')).toContain(
      event.orgid,
    );
  });
});

describe('installation.changed/v1 payload', () => {
  it('accepts all webhook-driven actions', () => {
    for (const action of [
      'created',
      'deleted',
      'suspended',
      'unsuspended',
      'repositories_added',
      'repositories_removed',
    ] as const) {
      expect(() =>
        installationChangedV1.parse({
          installationId: 1,
          accountLogin: 'a',
          accountType: 'User',
          action,
        }),
      ).not.toThrow();
    }
  });

  it('rejects an unknown action or missing installationId', () => {
    expect(() =>
      installationChangedV1.parse({
        installationId: 1,
        accountLogin: 'a',
        accountType: 'User',
        action: 'exploded',
      }),
    ).toThrow();
    expect(() =>
      installationChangedV1.parse({
        accountLogin: 'a',
        accountType: 'User',
        action: 'created',
      }),
    ).toThrow();
  });
});

describe('parseEvent (consumer-side validation, events.md §4/§6)', () => {
  it('round-trips a valid event through JSON', () => {
    const event = validEvent();
    const parsed = parseEvent(JSON.parse(JSON.stringify(event)));
    expect(parsed).toEqual(event);
  });

  it('rejects an unknown dataschema (never consume un-schema-d types)', () => {
    const event = { ...validEvent(), dataschema: 'mystery.event/v1' };
    expect(() => parseEvent(event)).toThrow(/mystery\.event\/v1/);
  });

  it('rejects a payload that does not match its declared schema', () => {
    const event = validEvent();
    const tampered = {
      ...event,
      data: { ...event.data, installationId: 'not-a-number' },
    };
    expect(() => parseEvent(tampered)).toThrow();
  });
});

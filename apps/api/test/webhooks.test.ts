import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { parseEvent, type EventEnvelope } from '@agent-git/events';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../src/github/webhook-signature';
import { WebhooksController } from '../src/github/webhooks.controller';
import {
  EVENT_PUBLISHER,
  INSTALLATION_SYNC,
  WebhooksService,
  type EventPublisher,
  type InstallationSync,
} from '../src/github/webhooks.service';

const SECRET = 'test-webhook-secret';
const ORG_ID = '01920000-0000-7000-8000-000000000001';

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifyWebhookSignature (unit)', () => {
  const body = Buffer.from('{"hello":"world"}');

  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(SECRET, body, sign(body.toString()))).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = sign(body.toString());
    expect(verifyWebhookSignature(SECRET, Buffer.from('{"hello":"evil"}'), sig)).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    expect(
      verifyWebhookSignature(SECRET, body, sign(body.toString(), 'other-secret')),
    ).toBe(false);
  });

  it('rejects missing or malformed headers', () => {
    expect(verifyWebhookSignature(SECRET, body, undefined)).toBe(false);
    expect(verifyWebhookSignature(SECRET, body, '')).toBe(false);
    expect(verifyWebhookSignature(SECRET, body, 'sha1=abcdef')).toBe(false);
    expect(verifyWebhookSignature(SECRET, body, 'sha256=zznothex')).toBe(false);
  });
});

describe('POST /api/github/webhooks (integration)', () => {
  let app: NestFastifyApplication;
  let published: EventEnvelope[];
  let synced: unknown[];
  let syncOrgId: string | null;

  const fakeSync: InstallationSync = {
    // eslint-disable-next-line @typescript-eslint/require-await
    syncFromWebhook: async (payload) => {
      synced.push(payload);
      return { orgId: syncOrgId };
    },
  };
  const fakePublisher: EventPublisher = {
    // eslint-disable-next-line @typescript-eslint/require-await
    publish: async (event) => {
      published.push(event);
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        WebhooksService,
        { provide: INSTALLATION_SYNC, useValue: fakeSync },
        { provide: EVENT_PUBLISHER, useValue: fakePublisher },
        {
          provide: ConfigService,
          useValue: new ConfigService({ GITHUB_WEBHOOK_SECRET: SECRET }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { rawBody: true },
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    published = [];
    synced = [];
    syncOrgId = ORG_ID;
  });

  afterAll(async () => {
    await app.close();
  });

  function post(opts: {
    event: string;
    payload: unknown;
    signature?: string | null;
    delivery?: string;
  }) {
    const body = JSON.stringify(opts.payload);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-github-event': opts.event,
      'x-github-delivery': opts.delivery ?? 'delivery-1',
    };
    if (opts.signature !== null) {
      headers['x-hub-signature-256'] = opts.signature ?? sign(body);
    }
    return app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'POST', url: '/api/github/webhooks', headers, payload: body });
  }

  const installationCreated = {
    action: 'created',
    installation: {
      id: 123,
      account: { login: 'acme', type: 'Organization' },
    },
  };

  it('accepts a signed installation event: syncs and publishes installation.changed', async () => {
    const res = await post({ event: 'installation', payload: installationCreated });

    expect(res.statusCode).toBe(202);
    expect(synced).toHaveLength(1);
    expect(published).toHaveLength(1);

    const event = parseEvent(published[0]);
    expect(event.type).toBe('agentgit.installation.changed');
    expect(event.orgid).toBe(ORG_ID);
    expect(event.subject).toBe('installation/123');
    expect((event.data as { action: string }).action).toBe('created');
  });

  it('maps installation_repositories to repositories_added with the repo list', async () => {
    const res = await post({
      event: 'installation_repositories',
      payload: {
        action: 'added',
        installation: { id: 123, account: { login: 'acme', type: 'Organization' } },
        repositories_added: [{ id: 99, full_name: 'acme/demo' }],
      },
    });

    expect(res.statusCode).toBe(202);
    const event = parseEvent(published[0]);
    const data = event.data as { action: string; repos: { fullName: string }[] };
    expect(data.action).toBe('repositories_added');
    expect(data.repos).toEqual([{ githubRepoId: 99, fullName: 'acme/demo' }]);
  });

  it('rejects a tampered signature with 401 and touches nothing', async () => {
    const res = await post({
      event: 'installation',
      payload: installationCreated,
      signature: sign('{"other":"body"}'),
    });

    expect(res.statusCode).toBe(401);
    expect(synced).toHaveLength(0);
    expect(published).toHaveLength(0);
  });

  it('rejects a missing signature with 401', async () => {
    const res = await post({
      event: 'installation',
      payload: installationCreated,
      signature: null,
    });

    expect(res.statusCode).toBe(401);
    expect(synced).toHaveLength(0);
  });

  it('routes push/pull_request without publishing (checkpoints are F3)', async () => {
    const res = await post({
      event: 'push',
      payload: { ref: 'refs/heads/main', repository: { full_name: 'acme/demo' } },
    });

    expect(res.statusCode).toBe(202);
    expect(published).toHaveLength(0);
    expect(synced).toHaveLength(0);
  });

  it('skips publishing when no org is mapped to the installation yet', async () => {
    syncOrgId = null;
    const res = await post({ event: 'installation', payload: installationCreated });

    expect(res.statusCode).toBe(202);
    expect(synced).toHaveLength(1);
    expect(published).toHaveLength(0);
  });
});

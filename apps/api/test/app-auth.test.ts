import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppAuthService } from '../src/github/app-auth.service';
import { OctokitFactory } from '../src/github/octokit.factory';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const APP_ID = '12345';

function makeService(): AppAuthService {
  const config = new ConfigService({
    GITHUB_APP_ID: APP_ID,
    GITHUB_APP_PRIVATE_KEY: privateKey,
  });
  return new AppAuthService(config);
}

describe('AppAuthService.appJwt (unit)', () => {
  it('mints an RS256 JWT with iss=appId and ~10-minute expiry', () => {
    const token = makeService().appJwt();

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;

    expect(decoded.iss).toBe(APP_ID);
    // GitHub rejects exp > 10 min; we back-date iat 60s for clock drift.
    expect(decoded.exp! - decoded.iat!).toBe(660);
    const now = Math.floor(Date.now() / 1000);
    expect(decoded.iat).toBeLessThanOrEqual(now);
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThanOrEqual(now + 600);
  });

  it('normalizes escaped newlines in the private key (env-var form)', () => {
    const config = new ConfigService({
      GITHUB_APP_ID: APP_ID,
      GITHUB_APP_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
    });
    const token = new AppAuthService(config).appJwt();
    expect(() => jwt.verify(token, publicKey, { algorithms: ['RS256'] })).not.toThrow();
  });

  it('throws a clear error when App config is missing', () => {
    const svc = new AppAuthService(new ConfigService({}));
    expect(() => svc.appJwt()).toThrow(/GITHUB_APP_ID|GITHUB_APP_PRIVATE_KEY/);
  });
});

describe('AppAuthService.installationToken (integration, mocked GitHub)', () => {
  let tokenRequests: number;

  const server = setupServer(
    http.post(
      'https://api.github.com/app/installations/:installationId/access_tokens',
      ({ params }) => {
        tokenRequests += 1;
        return HttpResponse.json(
          {
            token: `ghs_test_${params.installationId}_${tokenRequests}`,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
          { status: 201 },
        );
      },
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    tokenRequests = 0;
  });
  afterAll(() => server.close());

  it('exchanges the App JWT for an installation token', async () => {
    tokenRequests = 0;
    const { token, expiresAt } = await makeService().installationToken(123);

    expect(token).toBe('ghs_test_123_1');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(tokenRequests).toBe(1);
  });

  it('caches the token until expiry (no re-request on second call)', async () => {
    tokenRequests = 0;
    const svc = makeService();
    const first = await svc.installationToken(123);
    const second = await svc.installationToken(123);

    expect(second.token).toBe(first.token);
    expect(tokenRequests).toBe(1);
  });

  it('re-exchanges when the cached token is at/near expiry', async () => {
    tokenRequests = 0;
    server.use(
      http.post(
        'https://api.github.com/app/installations/:installationId/access_tokens',
        () => {
          tokenRequests += 1;
          return HttpResponse.json(
            {
              token: `ghs_short_${tokenRequests}`,
              // inside the 60s safety margin -> treated as expired
              expires_at: new Date(Date.now() + 10 * 1000).toISOString(),
            },
            { status: 201 },
          );
        },
      ),
    );

    const svc = makeService();
    await svc.installationToken(123);
    await svc.installationToken(123);
    expect(tokenRequests).toBe(2);
  });

  it('caches per installation id', async () => {
    tokenRequests = 0;
    const svc = makeService();
    const a = await svc.installationToken(1);
    const b = await svc.installationToken(2);

    expect(a.token).not.toBe(b.token);
    expect(tokenRequests).toBe(2);
  });
});

describe('OctokitFactory (integration, mocked GitHub)', () => {
  const server = setupServer(
    http.post(
      'https://api.github.com/app/installations/:installationId/access_tokens',
      () =>
        HttpResponse.json(
          {
            token: 'ghs_factory_token',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
          { status: 201 },
        ),
    ),
    http.get('https://api.github.com/repos/acme/demo', ({ request }) =>
      request.headers.get('authorization') === 'token ghs_factory_token'
        ? HttpResponse.json({ full_name: 'acme/demo', default_branch: 'main' })
        : HttpResponse.json({ message: 'Bad credentials' }, { status: 401 }),
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('returns an Octokit authenticated with the installation token', async () => {
    const factory = new OctokitFactory(makeService());
    const octokit = await factory.octokitForInstallation(42);

    const res = await octokit.repos.get({ owner: 'acme', repo: 'demo' });
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('acme/demo');
  });
});

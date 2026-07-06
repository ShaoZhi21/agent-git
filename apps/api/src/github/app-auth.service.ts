import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

export interface InstallationToken {
  token: string;
  expiresAt: Date;
}

// Refresh a cached token this long before GitHub's stated expiry, so a
// token handed to an Octokit call can't die mid-request.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

const GITHUB_API = 'https://api.github.com';

@Injectable()
export class AppAuthService {
  private readonly tokenCache = new Map<number, InstallationToken>();

  constructor(private readonly config: ConfigService) {}

  // Short-lived App JWT (spec F1 step 3): RS256, iss = app id, 10-min expiry,
  // iat back-dated 60s per GitHub's clock-drift guidance.
  appJwt(): string {
    const appId = this.config.get<string>('GITHUB_APP_ID');
    const rawKey = this.config.get<string>('GITHUB_APP_PRIVATE_KEY');
    if (!appId || !rawKey) {
      throw new Error(
        'GitHub App auth is not configured: set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY',
      );
    }
    // Env vars often carry the PEM with literal "\n" escapes.
    const privateKey = rawKey.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({ iat: now - 60, exp: now + 600, iss: appId }, privateKey, {
      algorithm: 'RS256',
    });
  }

  async installationToken(installationId: number): Promise<InstallationToken> {
    const cached = this.tokenCache.get(installationId);
    if (cached && cached.expiresAt.getTime() - Date.now() > EXPIRY_SAFETY_MARGIN_MS) {
      return cached;
    }

    const res = await fetch(
      `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.appJwt()}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
      },
    );
    if (!res.ok) {
      throw new Error(
        `Installation token exchange failed for installation ${installationId}: HTTP ${res.status}`,
      );
    }
    const body = (await res.json()) as { token: string; expires_at: string };
    const token: InstallationToken = {
      token: body.token,
      expiresAt: new Date(body.expires_at),
    };
    this.tokenCache.set(installationId, token);
    return token;
  }
}

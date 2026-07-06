import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { AppAuthService } from './app-auth.service';

// @octokit/rest is pinned to v20: v21+ is pure ESM and cannot be required
// from this CommonJS NestJS build (backend-structure.md quirk #5).
@Injectable()
export class OctokitFactory {
  constructor(private readonly appAuth: AppAuthService) {}

  async octokitForInstallation(installationId: number): Promise<Octokit> {
    const { token } = await this.appAuth.installationToken(installationId);
    return new Octokit({ auth: token });
  }
}

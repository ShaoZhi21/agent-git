import { Module } from '@nestjs/common';
import { AppAuthService } from './app-auth.service';
import { OctokitFactory } from './octokit.factory';

// GitHub App integration: App JWT -> installation token -> authenticated
// Octokit. The primitive every repo read uses (spec F1). Install flow and
// webhooks build on this in F1.4/F1.5.
@Module({
  providers: [AppAuthService, OctokitFactory],
  exports: [AppAuthService, OctokitFactory],
})
export class GithubModule {}

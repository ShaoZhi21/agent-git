import { Module } from '@nestjs/common';
import { AppAuthService } from './app-auth.service';
import { OctokitFactory } from './octokit.factory';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

// GitHub App integration (spec F1): App JWT -> installation token ->
// authenticated Octokit (F1.3), plus the HMAC-verified webhook receiver
// (F1.5). The INSTALLATION_SYNC / EVENT_PUBLISHER ports on WebhooksService
// get real providers in F1.4 (repo sync) and with the outbox (F1.1 lands).
@Module({
  controllers: [WebhooksController],
  providers: [AppAuthService, OctokitFactory, WebhooksService],
  exports: [AppAuthService, OctokitFactory],
})
export class GithubModule {}

import {
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { verifyWebhookSignature } from './webhook-signature';
import { WebhooksService } from './webhooks.service';

// GitHub webhook receiver (spec F1 step 4). HMAC is verified over the RAW
// body — main.ts bootstraps Nest with { rawBody: true } for this route.
@Controller('github/webhooks')
export class WebhooksController {
  constructor(
    @Inject(WebhooksService) private readonly webhooks: WebhooksService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(202)
  async receive(@Req() req: RawBodyRequest<FastifyRequest>): Promise<{ ok: true }> {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Webhook secret is not configured');
    }

    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!req.rawBody || !verifyWebhookSignature(secret, req.rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = (req.headers['x-github-event'] as string | undefined) ?? '';
    const deliveryId = (req.headers['x-github-delivery'] as string | undefined) ?? '';
    await this.webhooks.handle(event, deliveryId, req.body);
    return { ok: true };
  }
}

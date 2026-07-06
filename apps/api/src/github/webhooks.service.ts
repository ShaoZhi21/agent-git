import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  makeInstallationChanged,
  type EventEnvelope,
  type InstallationChangedV1,
} from '@agent-git/events';

// Ports the webhook handlers depend on. Real implementations arrive with
// later parts: INSTALLATION_SYNC is F1.4's RepoService.syncInstallationRepos;
// EVENT_PUBLISHER becomes the transactional OutboxService once packages/db
// lands (F1.1). Until then the defaults log and no-op so the receiver is
// fully testable and mergeable on its own.

export const INSTALLATION_SYNC = Symbol('INSTALLATION_SYNC');
export interface InstallationSync {
  /** Sync installations/repos from a webhook payload; returns the org the
   *  installation is bound to (null until an org has connected it). */
  syncFromWebhook(payload: InstallationWebhookPayload): Promise<{ orgId: string | null }>;
}

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
export interface EventPublisher {
  publish(event: EventEnvelope): Promise<void>;
}

export interface InstallationWebhookPayload {
  action: string;
  installation: {
    id: number;
    account: { login: string; type: 'Organization' | 'User' };
  };
  repositories_added?: { id: number; full_name: string }[];
  repositories_removed?: { id: number; full_name: string }[];
}

const INSTALLATION_ACTIONS: Record<string, InstallationChangedV1['action']> = {
  created: 'created',
  deleted: 'deleted',
  suspend: 'suspended',
  unsuspend: 'unsuspended',
  added: 'repositories_added',
  removed: 'repositories_removed',
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Optional() @Inject(INSTALLATION_SYNC) private readonly sync: InstallationSync | null,
    @Optional() @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher | null,
  ) {}

  async handle(event: string, deliveryId: string, payload: unknown): Promise<void> {
    switch (event) {
      case 'installation':
      case 'installation_repositories':
        await this.handleInstallation(payload as InstallationWebhookPayload);
        return;
      case 'push':
      case 'pull_request':
        // Routed only for now — checkpoint creation is F3 (later sprint).
        this.logger.log(`Received ${event} (delivery ${deliveryId}) — no handler yet (F3)`);
        return;
      default:
        this.logger.log(`Ignoring unhandled webhook event: ${event}`);
    }
  }

  private async handleInstallation(payload: InstallationWebhookPayload): Promise<void> {
    const { orgId } = (await this.sync?.syncFromWebhook(payload)) ?? { orgId: null };
    if (!orgId) {
      this.logger.log(
        `Installation ${payload.installation.id}: no org mapped yet; skipping event publish`,
      );
      return;
    }

    const action = INSTALLATION_ACTIONS[payload.action];
    if (!action) {
      this.logger.log(`Ignoring installation action: ${payload.action}`);
      return;
    }

    const repos = (payload.repositories_added ?? payload.repositories_removed)?.map(
      (r) => ({ githubRepoId: r.id, fullName: r.full_name }),
    );
    const event = makeInstallationChanged({
      orgId,
      data: {
        installationId: payload.installation.id,
        accountLogin: payload.installation.account.login,
        accountType: payload.installation.account.type,
        action,
        ...(repos ? { repos } : {}),
      },
    });
    await this.publisher?.publish(event);
  }
}

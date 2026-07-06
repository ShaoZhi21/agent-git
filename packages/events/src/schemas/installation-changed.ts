import { z } from 'zod';
import { defineEvent } from '../envelope';

// agentgit.installation.changed/v1 — emitted when a GitHub App installation
// is created/removed/suspended or its repository grant changes (F1.5).
// Consumers: repo-sync projections, audit. Additive changes only within v1.

export const installationChangedV1 = z.object({
  installationId: z.number().int(),
  accountLogin: z.string().min(1),
  accountType: z.enum(['Organization', 'User']),
  action: z.enum([
    'created',
    'deleted',
    'suspended',
    'unsuspended',
    'repositories_added',
    'repositories_removed',
  ]),
  repos: z
    .array(z.object({ githubRepoId: z.number().int(), fullName: z.string() }))
    .optional(),
});

export type InstallationChangedV1 = z.infer<typeof installationChangedV1>;

export const installationChanged = defineEvent({
  entity: 'installation',
  action: 'changed',
  version: 1,
  schema: installationChangedV1,
  subject: (data) => `installation/${data.installationId}`,
});

export function makeInstallationChanged(opts: {
  orgId: string;
  data: InstallationChangedV1;
}) {
  return installationChanged.make(opts);
}

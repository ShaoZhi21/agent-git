import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

// Reference contract demonstrating the ts-rest pattern. Real feature contracts
// (agents, checkpoints, eval-runs, ...) are defined the same way and live here in
// packages/contracts. See docs/conventions/api-and-versioning.md.
export const systemContract = c.router(
  {
    info: {
      method: 'GET',
      path: '/system/info',
      responses: {
        200: z.object({
          name: z.literal('agentgit'),
          version: z.string(),
        }),
      },
      summary: 'Basic service info.',
    },
  },
  {
    // All public routes are versioned (see api-and-versioning.md D4).
    pathPrefix: '/v1',
  },
);

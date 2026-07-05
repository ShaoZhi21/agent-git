import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { systemContract } from '@agent-git/contracts';

// THE reference for feature endpoints: a NestJS controller that IMPLEMENTS a
// ts-rest contract. Inputs/outputs are validated against the contract's zod
// schemas; the return type is checked against `responses`. Route comes from the
// contract (GET /api/v1/system/info). See docs/conventions/backend-structure.md.
@Controller()
export class SystemController {
  @TsRestHandler(systemContract)
  handler() {
    return tsRestHandler(systemContract, {
      info: async () => ({
        status: 200,
        body: { name: 'agentgit' as const, version: '0.0.0' },
      }),
    });
  }
}

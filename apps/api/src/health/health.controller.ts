import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service';

// Infra/liveness endpoints use a plain Nest controller (not the ts-rest contract).
// Route: GET /api/health  (global prefix 'api' + controller path 'health').
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): HealthStatus {
    return this.health.check();
  }
}

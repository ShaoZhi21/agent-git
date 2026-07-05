import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  uptime: number;
}

@Injectable()
export class HealthService {
  check(): HealthStatus {
    return { status: 'ok', uptime: process.uptime() };
  }
}

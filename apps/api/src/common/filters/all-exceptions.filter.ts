import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

// Maps every error to RFC 9457 application/problem+json.
// See docs/conventions/api-and-versioning.md §6.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<{ url?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const title =
      exception instanceof HttpException
        ? exception.message
        : 'Internal Server Error';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    void reply
      .status(status)
      .header('content-type', 'application/problem+json')
      .send({
        type: 'about:blank',
        title,
        status,
        instance: request?.url,
      });
  }
}

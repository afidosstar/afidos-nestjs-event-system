import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  
  @Injectable()
  export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest();
      const { method, url, body } = request;
      const correlationId = request.headers['x-correlation-id'] || 'unknown';
  
      const start = Date.now();
  
      this.logger.log(`[${correlationId}] ${method} ${url} - Request started`);
  
      if (body && Object.keys(body).length > 0) {
        this.logger.debug(`[${correlationId}] Request body:`, body);
      }
  
      return next.handle().pipe(
        tap({
          next: (data) => {
            const duration = Date.now() - start;
            this.logger.log(`[${correlationId}] ${method} ${url} - Completed in ${duration}ms`);
            
            if (data) {
              this.logger.debug(`[${correlationId}] Response:`, data);
            }
          },
          error: (error) => {
            const duration = Date.now() - start;
            this.logger.error(
              `[${correlationId}] ${method} ${url} - Failed in ${duration}ms`,
              error.stack
            );
          },
        })
      );
    }
  }
  
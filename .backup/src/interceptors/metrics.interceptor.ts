import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { MetricsService } from '../services/metrics.service';
  
  @Injectable()
  export class MetricsInterceptor implements NestInterceptor {
    constructor(private metricsService: MetricsService) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest();
      const { method, url } = request;
      const start = Date.now();
  
      return next.handle().pipe(
        tap({
          next: () => {
            const duration = (Date.now() - start) / 1000;
            // Record HTTP request metrics
            // This would be implemented based on your metrics requirements
          },
          error: () => {
            const duration = (Date.now() - start) / 1000;
            // Record error metrics
          },
        })
      );
    }
  }
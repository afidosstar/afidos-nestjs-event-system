import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Add correlation ID if not present
    if (!req.headers['x-correlation-id']) {
      req.headers['x-correlation-id'] = uuidv4();
    }

    // Add request timestamp
    (req as any).startTime = Date.now();

    // Add user context (if authenticated)
    (req as any).userContext = {
      userId: req.headers['x-user-id'],
      tenantId: req.headers['x-tenant-id'],
    };

    next();
  }
}
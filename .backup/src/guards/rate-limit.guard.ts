import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { InjectRedis } from '@nestjs-modules/ioredis';
  import { Redis } from 'ioredis';
  
  export const RateLimit = Reflector.createDecorator<{
    ttl: number;
    limit: number;
    keyGenerator?: (req: any) => string;
  }>();
  
  @Injectable()
  export class RateLimitGuard implements CanActivate {
    constructor(
      private reflector: Reflector,
      @InjectRedis() private redis: Redis,
    ) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const rateLimitOptions = this.reflector.get(RateLimit, context.getHandler());
      
      if (!rateLimitOptions) {
        return true;
      }
  
      const request = context.switchToHttp().getRequest();
      const key = rateLimitOptions.keyGenerator 
        ? rateLimitOptions.keyGenerator(request)
        : `rate_limit:${request.ip}:${context.getHandler().name}`;
  
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, rateLimitOptions.ttl);
      }
  
      if (current > rateLimitOptions.limit) {
        throw new HttpException(
          `Rate limit exceeded. Max ${rateLimitOptions.limit} requests per ${rateLimitOptions.ttl} seconds`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
  
      return true;
    }
  }
  
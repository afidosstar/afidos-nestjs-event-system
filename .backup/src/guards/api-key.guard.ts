import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
  } from '@nestjs/common';
  
  @Injectable()
  export class ApiKeyGuard implements CanActivate {
    private readonly validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const apiKey = request.headers['x-api-key'];
  
      if (!apiKey) {
        throw new UnauthorizedException('API key is required');
      }
  
      if (!this.validApiKeys.includes(apiKey)) {
        throw new UnauthorizedException('Invalid API key');
      }
  
      return true;
    }
  }
  
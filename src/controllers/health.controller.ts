import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async checkHealth() {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  async checkReadiness() {
    const health = await this.healthService.checkHealth();
    
    if (health.status === 'unhealthy') {
      throw new Error('Service not ready');
    }
    
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}

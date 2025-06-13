import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventTypeEntity } from '../entities/event-type.entity';
import { NotificationProvider } from '../providers/base/notification-provider.interface';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheck;
    queue: HealthCheck;
    providers: Record<string, HealthCheck>;
  };
  uptime: number;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectRepository(EventTypeEntity)
    private eventTypeRepository: Repository<EventTypeEntity>,
    private providers: NotificationProvider[] = [],
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkQueue(),
      this.checkProviders(),
    ]);

    const [databaseResult, queueResult, providersResult] = checks;

    const database = databaseResult.status === 'fulfilled'
      ? databaseResult.value
      : { status: 'unhealthy' as const, message: 'Database check failed' };

    const queue = queueResult.status === 'fulfilled'
      ? queueResult.value
      : { status: 'unhealthy' as const, message: 'Queue check failed' };

    const providers = providersResult.status === 'fulfilled'
      ? providersResult.value
      : {};

    const overallStatus = this.determineOverallStatus(database, queue, providers);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database,
        queue,
        providers,
      },
      uptime: Date.now() - this.startTime,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      await this.eventTypeRepository.count();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error('Database health check failed:', error);

      return {
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkQueue(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const stats = await this.notificationQueue.getJobCounts();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          waiting: stats.waiting,
          active: stats.active,
          completed: stats.completed,
          failed: stats.failed,
        },
      };
    } catch (error: any) {
      this.logger.error('Queue health check failed:', error);

      return {
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkProviders(): Promise<Record<string, HealthCheck>> {
    const results: Record<string, HealthCheck> = {};

    await Promise.allSettled(
      this.providers.map(async (provider) => {
        const startTime = Date.now();
        const key = `${provider.channel}-${provider.name}`;

        try {
          const isHealthy = await provider.healthCheck();

          results[key] = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            responseTime: Date.now() - startTime,
          };
        } catch (error: any) {
          this.logger.error(`Provider ${key} health check failed:`, error);

          results[key] = {
            status: 'unhealthy',
            message: error.message,
            responseTime: Date.now() - startTime,
          };
        }
      })
    );

    return results;
  }

  private determineOverallStatus(
    database: HealthCheck,
    queue: HealthCheck,
    providers: Record<string, HealthCheck>
  ): 'healthy' | 'unhealthy' | 'degraded' {
    // Critical components
    if (database.status === 'unhealthy' || queue.status === 'unhealthy') {
      return 'unhealthy';
    }

    // Check providers
    const providerStatuses = Object.values(providers);
    const unhealthyProviders = providerStatuses.filter(p => p.status === 'unhealthy');

    if (unhealthyProviders.length === providerStatuses.length && providerStatuses.length > 0) {
      return 'unhealthy';
    }

    if (unhealthyProviders.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }
}

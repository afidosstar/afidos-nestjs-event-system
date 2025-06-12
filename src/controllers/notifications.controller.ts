import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventLog } from '../entities/event-log.entity';
import { EventEmitterService } from '../services/event-emitter.service';
import { NotificationProcessorService } from '../services/notification-processor.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectRepository(EventLog)
    private eventLogRepository: Repository<EventLog>,
    private eventEmitter: EventEmitterService,
    private notificationProcessor: NotificationProcessorService,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  @Get('logs')
  async getLogs(
    @Query('eventType') eventType?: string,
    @Query('status') status?: string,
    @Query('correlationId') correlationId?: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0
  ) {
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    if (correlationId) where.correlationId = correlationId;

    const [logs, total] = await this.eventLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  @Get('stats')
  async getStats(@Query('period') period = '24h') {
    const hours = this.parsePeriod(period);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await this.eventLogRepository
      .createQueryBuilder('log')
      .select([
        'log.eventType',
        'log.status',
        'COUNT(*) as count',
        'AVG(EXTRACT(EPOCH FROM (log.processedAt - log.createdAt))) as avgProcessingTime'
      ])
      .where('log.createdAt >= :since', { since })
      .groupBy('log.eventType, log.status')
      .getRawMany();

    // Get queue stats
    const queueStats = await this.notificationQueue.getJobCounts();

    return {
      eventStats: stats,
      queueStats,
      period,
    };
  }

  @Post('emit')
  async emitEvent(@Body() body: {
    eventType: string;
    payload: any;
    options?: any;
  }) {
    const { eventType, payload, options } = body;
    return this.eventEmitter.emit(eventType, payload, options);
  }

  @Post('test/:channel')
  async testChannel(
    @Param('channel') channel: string,
    @Body() testData: {
      recipient: string;
      payload: any;
    }
  ) {
    // This would test a specific notification channel
    const mockRecipient = {
      recipientType: 'email' as any,
      recipientId: testData.recipient,
      config: {},
    };

    // Get appropriate provider and test
    const result = await this.notificationProcessor.testNotification(
      channel as any,
      testData.payload,
      mockRecipient
    );

    return {
      channel,
      recipient: testData.recipient,
      result,
      timestamp: new Date(),
    };
  }

  @Post('retry/:logId')
  async retryNotification(@Param('logId') logId: string) {
    const eventLog = await this.eventLogRepository.findOne({
      where: { id: logId }
    });

    if (!eventLog) {
      throw new Error('Event log not found');
    }

    if (eventLog.status !== 'failed') {
      throw new Error('Only failed notifications can be retried');
    }

    // Add retry job to queue
    await this.notificationQueue.add('retry-notification', {
      eventLogId: logId,
      retryAttempt: (eventLog.results?.length || 0) + 1,
    });

    return {
      message: 'Retry job queued successfully',
      eventLogId: logId,
    };
  }

  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([hdwmy])$/);
    if (!match) return 24; // default to 24 hours

    const [, value, unit] = match;
    const num = parseInt(value);

    switch (unit) {
      case 'h': return num;
      case 'd': return num * 24;
      case 'w': return num * 24 * 7;
      case 'm': return num * 24 * 30;
      case 'y': return num * 24 * 365;
      default: return 24;
    }
  }
}

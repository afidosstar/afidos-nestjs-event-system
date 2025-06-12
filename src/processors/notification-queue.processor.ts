import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from '../entities/event-log.entity';
import { NotificationProcessorService } from '../services/notification-processor.service';

@Processor('notifications')
export class NotificationQueueProcessor {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  constructor(
    private notificationProcessor: NotificationProcessorService,
    @InjectRepository(EventLog)
    private eventLogRepository: Repository<EventLog>,
  ) {}

  @Process('process-event')
  async handleProcessEvent(job: Job<{
    eventId: string;
    eventType: string;
    payload: any;
    correlationId: string;
    eventTypeConfig: any;
  }>) {
    const { eventId, eventType, payload, correlationId } = job.data;

    this.logger.log(`Processing event ${eventType} with ID ${eventId}`);

    try {
      // Update status to processing
      await this.eventLogRepository.update(eventId, {
        status: 'processing',
      });

      // Process notifications
      const results = await this.notificationProcessor.processNotifications(
        eventType,
        payload,
        correlationId
      );

      // Update with results
      await this.eventLogRepository.update(eventId, {
        status: 'completed',
        results,
        processedAt: new Date(),
      });

      this.logger.log(`Completed processing event ${eventType} with ID ${eventId}`);
      return results;
    } catch (error: any) {
      this.logger.error(`Failed to process event ${eventType} with ID ${eventId}:`, error);

      // Update with error
      await this.eventLogRepository.update(eventId, {
        status: 'failed',
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date(),
        } as Record<string, any>,
        processedAt: new Date(),
      });

      throw error;
    }
  }

  @Process('retry-notification')
  async handleRetryNotification(job: Job<{
    eventLogId: string;
    retryAttempt: number;
  }>) {
    const { eventLogId, retryAttempt } = job.data;

    this.logger.log(`Retrying notification for event log ${eventLogId}, attempt ${retryAttempt}`);

    try {
      const eventLog = await this.eventLogRepository.findOne({
        where: { id: eventLogId }
      });

      if (!eventLog) {
        throw new Error(`Event log ${eventLogId} not found`);
      }

      // Process notifications again
      const results = await this.notificationProcessor.processNotifications(
        eventLog.eventType,
        eventLog.payload,
        eventLog.correlationId
      );

      // Update with new results
      await this.eventLogRepository.update(eventLogId, {
        status: 'completed',
        results,
        processedAt: new Date(),
      });

      return results;
    } catch (error) {
      this.logger.error(`Retry failed for event log ${eventLogId}:`, error);
      throw error;
    }
  }
}

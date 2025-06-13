import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from '../entities/event-log.entity';
import { NotificationProcessorService } from '../services/notification-processor.service';

@Processor('retry')
export class RetryProcessor {
  private readonly logger = new Logger(RetryProcessor.name);

  constructor(
    private notificationProcessor: NotificationProcessorService,
    @InjectRepository(EventLog)
    private eventLogRepository: Repository<EventLog>,
  ) {}

  @Process('retry-failed-notifications')
  async handleRetryFailedNotifications(job: Job<{
    eventLogId: string;
    retryAttempt: number;
    maxRetries: number;
  }>) {
    const { eventLogId, retryAttempt, maxRetries } = job.data;

    this.logger.log(`Retrying notification ${eventLogId}, attempt ${retryAttempt}/${maxRetries}`);

    try {
      const eventLog = await this.eventLogRepository.findOne({
        where: { id: eventLogId }
      });

      if (!eventLog) {
        throw new Error(`Event log ${eventLogId} not found`);
      }

      if (eventLog.status !== 'failed') {
        this.logger.warn(`Event log ${eventLogId} is not in failed status, skipping retry`);
        return;
      }

      // Update status to processing
      await this.eventLogRepository.update(eventLogId, {
        status: 'processing',
      });

      // Retry processing
      const results: any[] = await this.notificationProcessor.processNotifications(
        eventLog.eventType,
        eventLog.payload,
        eventLog.correlationId
      );

      const hasFailures = results.some(r => r.status === 'failed');

      if (hasFailures && retryAttempt < maxRetries) {
        // Schedule another retry
        await this.scheduleRetry(eventLogId, retryAttempt + 1, maxRetries);

        await this.eventLogRepository.update(eventLogId, {
          status: 'failed',
          results,
          error: {
            message: 'Some notifications failed, will retry',
            retryAttempt,
            timestamp: new Date(),
          }as any,
        });
      } else {
        // Final result
        const finalStatus = hasFailures ? 'failed' : 'completed';

        await this.eventLogRepository.update(eventLogId, {
          status: finalStatus,
          results,
          processedAt: new Date(),
          error: hasFailures ? {
            message: 'Max retries reached',
            retryAttempt,
            timestamp: new Date(),
          }as any : undefined,
        });
      }

      return results;
    } catch (error: any) {
      this.logger.error(`Retry failed for event log ${eventLogId}:`, error);

      await this.eventLogRepository.update(eventLogId, {
        status: 'failed',
        error: {
          message: error.message,
          stack: error.stack,
          retryAttempt,
          timestamp: new Date(),
        } as any,
      });

      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing retry job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Completed retry job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Failed retry job ${job.id} of type ${job.name}:`, err);
  }

  private async scheduleRetry(eventLogId: string, retryAttempt: number, maxRetries: number) {
    // Exponential backoff: 2^attempt * 1000ms
    const delay = Math.pow(2, retryAttempt) * 1000;

    // Add to retry queue with delay
    // This would be implemented by the service that uses this processor
  }
}

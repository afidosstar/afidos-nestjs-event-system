import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationProcessorService } from '../services/notification-processor.service';

interface BatchJobData {
  batchId: string;
  events: {
    eventId: string;
    eventType: string;
    payload: any;
    correlationId: string;
  }[];
}

@Processor('batch')
export class BatchProcessor {
  private readonly logger = new Logger(BatchProcessor.name);

  constructor(
    private notificationProcessor: NotificationProcessorService,
  ) {}

  @Process('process-batch')
  async handleBatchProcessing(job: Job<BatchJobData>) {
    const { batchId, events } = job.data;

    this.logger.log(`Processing batch ${batchId} with ${events.length} events`);

    const results = [];

    // Process events in parallel with concurrency limit
    const concurrency = 5;
    const chunks = this.chunkArray(events, concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (event) => {
          try {
            const result = await this.notificationProcessor.processNotifications(
              event.eventType,
              event.payload,
              event.correlationId
            );

            return {
              eventId: event.eventId,
              status: 'success',
              results: result,
            };
          } catch (error: any) {
            this.logger.error(`Failed to process event ${event.eventId}:`, error);

            return {
              eventId: event.eventId,
              status: 'failed',
              error: error.message,
            };
          }
        })
      );

      results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
    }

    this.logger.log(`Completed batch ${batchId}, processed ${results.length} events`);

    return {
      batchId,
      totalEvents: events.length,
      successCount: results.filter(r => r.status === 'success').length,
      failureCount: results.filter(r => r.status === 'failed').length,
      results,
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

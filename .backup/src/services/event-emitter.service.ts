import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from '../entities/event-log.entity';
import { EventTypeEntity } from '../entities/event-type.entity';
import { v4 as uuidv4 } from 'uuid';
import {FieldSchema} from "@/config";
import {EmitOptions, EventEmissionResult, NotificationResult} from "@/types";

@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectRepository(EventLog) private eventLogRepository: Repository<EventLog>,
    @InjectRepository(EventTypeEntity) private eventTypeRepository: Repository<EventTypeEntity>,
  ) {}

  async emit<T extends string>(
    eventType: T,
    payload: any,
    options: EmitOptions = {}
  ): Promise<EventEmissionResult> {
    const correlationId = options.correlationId || uuidv4();
    const eventId = uuidv4();

    // Get event type configuration
    const eventTypeConfig = await this.eventTypeRepository.findOne({
      where: { name: eventType, enabled: true }
    });

    if (!eventTypeConfig) {
      throw new Error(`Event type ${eventType} not found or disabled`);
    }

    // Validate payload against schema
    this.validatePayload(payload, eventTypeConfig.schema);

    // Determine processing mode
    const mode = options.mode || eventTypeConfig.defaultProcessing;
    const waitForResult = options.waitForResult ?? eventTypeConfig.waitForResult;

    // Create event log
    const eventLog = await this.eventLogRepository.save({
      id: eventId,
      eventType,
      payload,
      correlationId,
      mode,
      status: 'pending',
      queuedAt: mode === 'async' ? new Date() : undefined,
    });

    const result: EventEmissionResult = {
      eventId,
      correlationId,
      mode,
      waitedForResult: waitForResult,
      queuedAt: mode === 'async' ? new Date() : undefined,
    };

    if (mode === 'sync' || (mode === 'async' && waitForResult)) {
      // Process synchronously or wait for async result
      result.results = await this.processEvent(eventTypeConfig, payload, correlationId);
      result.processedAt = new Date();

      await this.eventLogRepository.update(eventId, {
        status: 'completed',
        results: result.results as any,
        processedAt: result.processedAt,
      });
    } else {
      // Queue for async processing
      await this.notificationQueue.add(
        'process-event',
        {
          eventId,
          eventType,
          payload,
          correlationId,
          eventTypeConfig,
        },
        {
          priority: this.getPriorityValue(options.priority || eventTypeConfig.priority),
          delay: options.delay || 0,
        }
      );
    }

    return result;
  }

  async emitSync<T extends string>(
    eventType: T,
    payload: any
  ): Promise<EventEmissionResult> {
    return this.emit(eventType, payload, { mode: 'sync', waitForResult: true });
  }

  async emitAsync<T extends string>(
    eventType: T,
    payload: any,
    delay = 0
  ): Promise<EventEmissionResult> {
    return this.emit(eventType, payload, { mode: 'async', delay });
  }

  private validatePayload(payload: any, schema: Record<string, FieldSchema>): void {
    for (const [field, fieldSchema] of Object.entries(schema)) {
      if (fieldSchema.required && !(field in payload)) {
        throw new Error(`Required field ${field} is missing`);
      }

      if (field in payload) {
        const value = payload[field];
        const expectedType = fieldSchema.type;

        if (expectedType === 'string' && typeof value !== 'string') {
          throw new Error(`Field ${field} must be a string`);
        }
        if (expectedType === 'number' && typeof value !== 'number') {
          throw new Error(`Field ${field} must be a number`);
        }
        if (expectedType === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Field ${field} must be a boolean`);
        }
        if (expectedType === 'date' && !(value instanceof Date)) {
          throw new Error(`Field ${field} must be a Date`);
        }
      }
    }
  }

  private async processEvent(
    eventTypeConfig: EventTypeEntity,
    payload: any,
    correlationId: string
  ): Promise<NotificationResult[]> {
    // This will be implemented by the notification processor
    // For now, return empty array
    return [];
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 10;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }
}

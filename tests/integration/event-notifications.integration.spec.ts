import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventNotificationsModule } from '../../src/module/event-notifications.module';
import { EventEmitterService } from '../../src/services/event-emitter.service';
import { EventType, EventRecipient, EventLog } from '../../src/entities';

describe('EventNotifications Integration', () => {
  let app: TestingModule;
  let eventEmitterService: EventEmitterService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [EventType, EventRecipient, EventLog],
          synchronize: true,
        }),
        EventNotificationsModule.forRoot({
          eventTypes: {
            'test.event': {
              description: 'Test event',
              schema: {
                userId: { type: 'number', required: true },
                message: { type: 'string', required: true },
              },
              defaultProcessing: 'sync',
              waitForResult: true,
              channels: ['email'],
              priority: 'normal',
            },
          },
          mode: 'hybrid',
          providers: {
            email: {
              driver: 'mock',
              config: {},
            },
          },
          queue: {
            redis: {
              host: 'localhost',
              port: 6379,
            },
            concurrency: 1,
            retryOptions: {
              attempts: 1,
              delay: 1000,
            },
          },
          database: {
            autoSync: true,
            entities: ['**/*.entity{.ts,.js}'],
          },
        }),
      ],
    }).compile();

    eventEmitterService = app.get<EventEmitterService>(EventEmitterService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should emit and process events end-to-end', async () => {
    const payload = {
      userId: 123,
      message: 'Hello World',
    };

    const result = await eventEmitterService.emit('test.event', payload);

    expect(result.eventId).toBeDefined();
    expect(result.correlationId).toBeDefined();
    expect(result.mode).toBe('sync');
    expect(result.waitedForResult).toBe(true);
  });
});


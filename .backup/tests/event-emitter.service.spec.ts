import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitterService } from '../src/services/event-emitter.service';
import { EventTypeEntity, EventLog } from '../src/entities';
import { Repository } from 'typeorm';
import { Queue } from 'bull';

describe('EventEmitterService', () => {
  let service: EventEmitterService;
  let eventTypeRepository: jest.Mocked<Repository<EventTypeEntity>>;
  let eventLogRepository: jest.Mocked<Repository<EventLog>>;
  let notificationQueue: jest.Mocked<Queue>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEmitterService,
        {
          provide: getRepositoryToken(EventTypeEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventLog),
          useValue: {
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getQueueToken('notifications'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventEmitterService>(EventEmitterService);
    eventTypeRepository = module.get(getRepositoryToken(EventTypeEntity));
    eventLogRepository = module.get(getRepositoryToken(EventLog));
    notificationQueue = module.get(getQueueToken('notifications'));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emit', () => {
    const mockEventType = {
      id: '1',
      name: 'user.welcome',
      description: 'Welcome user',
      schema: {
        userId: { type: 'number', required: true },
        email: { type: 'string', required: true },
      },
      channels: ['email'],
      defaultProcessing: 'async',
      waitForResult: false,
      enabled: true,
    } as EventTypeEntity;

    beforeEach(() => {
      eventTypeRepository.findOne.mockResolvedValue(mockEventType);
      eventLogRepository.save.mockResolvedValue({
        id: 'log-1',
        eventType: 'user.welcome',
        correlationId: 'corr-1',
        mode: 'async',
        status: 'pending',
      } as EventLog);
    });

    it('should emit async event successfully', async () => {
      const payload = { userId: 123, email: 'test@example.com' };

      const result = await service.emit('user.welcome', payload);

      expect(result.mode).toBe('async');
      expect(result.waitedForResult).toBe(false);
      expect(notificationQueue.add).toHaveBeenCalledWith(
        'process-event',
        expect.objectContaining({
          eventType: 'user.welcome',
          payload,
        }),
        expect.any(Object)
      );
    });

    it('should validate payload schema', async () => {
      const invalidPayload = { userId: 'invalid' }; // missing email, wrong type

      await expect(service.emit('user.welcome', invalidPayload))
        .rejects.toThrow('Required field email is missing');
    });

    it('should throw error for disabled event type', async () => {
      eventTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.emit('unknown.event', {}))
        .rejects.toThrow('Event type unknown.event not found or disabled');
    });

    it('should process sync event immediately', async () => {
      mockEventType.defaultProcessing = 'sync';
      mockEventType.waitForResult = true;

      const payload = { userId: 123, email: 'test@example.com' };

      const result = await service.emit('user.welcome', payload);

      expect(result.mode).toBe('sync');
      expect(result.waitedForResult).toBe(true);
      expect(result.processedAt).toBeDefined();
    });
  });
});

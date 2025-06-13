import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationProcessorService } from '../src/services/notification-processor.service';
import { EventRecipient } from '../src/entities';
import { Repository } from 'typeorm';
import { SmtpEmailProvider } from '../src/providers/email/smtp-email.provider';

describe('NotificationProcessorService', () => {
  let service: NotificationProcessorService;
  let eventRecipientRepository: jest.Mocked<Repository<EventRecipient>>;
  let mockEmailProvider: jest.Mocked<SmtpEmailProvider>;

  beforeEach(async () => {
    mockEmailProvider = {
      name: 'smtp',
      channel: 'email',
      send: jest.fn(),
      validateConfig: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationProcessorService,
          useFactory: (repo) => new NotificationProcessorService(repo, [mockEmailProvider]),
          inject: [getRepositoryToken(EventRecipient)],
        },
        {
          provide: getRepositoryToken(EventRecipient),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationProcessorService>(NotificationProcessorService);
    eventRecipientRepository = module.get(getRepositoryToken(EventRecipient));
  });

  it('should process notifications successfully', async () => {
    const mockRecipients = [
      {
        id: '1',
        eventTypeName: 'user.welcome',
        channel: 'email',
        recipientType: 'email',
        recipientId: 'user@example.com',
        config: { driver: 'smtp' },
        enabled: true,
      },
    ] as EventRecipient[];

    eventRecipientRepository.find.mockResolvedValue(mockRecipients);
    mockEmailProvider.send.mockResolvedValue({
      channel: 'email',
      status: 'sent',
      timestamp: new Date(),
    });

    const payload = { userId: 123, email: 'user@example.com' };
    const results = await service.processNotifications('user.welcome', payload, 'corr-1');

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('sent');
    expect(mockEmailProvider.send).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({
        recipientId: 'user@example.com',
      })
    );
  });

  it('should handle provider failures gracefully', async () => {
    const mockRecipients = [
      {
        id: '1',
        eventTypeName: 'user.welcome',
        channel: 'email',
        recipientType: 'email',
        recipientId: 'user@example.com',
        config: { driver: 'smtp' },
        enabled: true,
      },
    ] as EventRecipient[];

    eventRecipientRepository.find.mockResolvedValue(mockRecipients);
    mockEmailProvider.send.mockRejectedValue(new Error('SMTP connection failed'));

    const payload = { userId: 123, email: 'user@example.com' };
    const results = await service.processNotifications('user.welcome', payload, 'corr-1');

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].message).toBe('SMTP connection failed');
  });
});

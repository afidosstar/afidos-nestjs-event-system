import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventNotificationsConfig } from '../config/notification-config.interface';
import { EventNotificationsCoreModule } from './event-notifications-core.module';
import { EventType, EventRecipient, EventLog } from '../entities';
import { EventEmitterService } from '../services/event-emitter.service';
import { NotificationProcessorService } from '../services/notification-processor.service';
import {SmtpConfig, SmtpEmailProvider} from '../providers/email/smtp-email.provider';

@Module({})
export class EventNotificationsModule {
  static forRoot(config: EventNotificationsConfig): DynamicModule {
    const providers: Provider[] = [];

    // Configure notification providers
    if (config.providers.email?.driver === 'smtp') {
      providers.push({
        provide: SmtpEmailProvider,
        useFactory: () => new SmtpEmailProvider(config.providers.email.config as SmtpConfig),
      });
    }

    return {
      module: EventNotificationsModule,
      imports: [
        EventNotificationsCoreModule,
        EventEmitterModule.forRoot({
          wildcard: false,
          delimiter: '.',
          newListener: false,
          removeListener: false,
          maxListeners: 10,
          verboseMemoryLeak: false,
          ignoreErrors: false,
        }),
        BullModule.forRoot({
          redis: config.queue.redis,
        }),
        BullModule.registerQueue({
          name: 'notifications',
          defaultJobOptions: config.queue.defaultJobOptions,
        }),
        TypeOrmModule.forFeature([EventType, EventRecipient, EventLog]),
      ],
      providers: [
        {
          provide: 'EVENT_NOTIFICATIONS_CONFIG',
          useValue: config,
        },
        EventEmitterService,
        NotificationProcessorService,
        ...providers,
      ],
      exports: [
        EventEmitterService,
        NotificationProcessorService,
        'EVENT_NOTIFICATIONS_CONFIG',
      ],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<EventNotificationsConfig> | EventNotificationsConfig;
  }): DynamicModule {
    return {
      module: EventNotificationsModule,
      imports: [
        EventNotificationsCoreModule,
        EventEmitterModule.forRoot(),
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: 'EVENT_NOTIFICATIONS_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: ['EVENT_NOTIFICATIONS_CONFIG'],
    };
  }
}

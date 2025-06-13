import { EventNotificationsConfig } from './notification-config.interface';

export const defaultEventNotificationsConfig: Partial<EventNotificationsConfig> = {
  mode: 'hybrid',
  queue: {
    redis: {
      host: 'localhost',
      port: 6379,
    },
    concurrency: 5,
    retryOptions: {
      attempts: 3,
      delay: 2000,
      backoff: 'exponential',
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
  database: {
    autoSync: false,
    entities: ['dist/**/*.entity{.ts,.js}'],
    logging: false,
  },
  monitoring: {
    enabled: true,
    metricsPrefix: 'event_notifications_',
  },
  exposeManagementApi: false,
  apiPrefix: 'notifications',
  customProviders: [],
};
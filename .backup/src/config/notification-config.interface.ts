import { EventTypesConfig, RetryPolicy } from "./event-config.interface";

export interface NotificationProviderConfig {
    driver: string;
    config: Record<string, any> ;
    enabled?: boolean;
  }

  export interface QueueConfig {
    redis: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    };
    concurrency: number;
    retryOptions: RetryPolicy;
    defaultJobOptions?: {
      removeOnComplete?: number;
      removeOnFail?: number;
    };
  }

  export interface DatabaseConfig {
    autoSync: boolean;
    entities: string[];
    migrations?: string[];
    logging?: boolean;
  }

  export interface EventNotificationsConfig {
    eventTypes: EventTypesConfig;
    mode: 'api' | 'worker' | 'hybrid';
    providers: Record<string, NotificationProviderConfig>;
    queue: QueueConfig;
    database: DatabaseConfig;
    monitoring?: {
      enabled: boolean;
      metricsPrefix?: string;
    };
    exposeManagementApi?: boolean;
    apiPrefix?: string;
    customProviders?: any[];
  }

export * from './module/event-notifications.module';
export * from './module/event-notifications-core.module';

// Configuration exports
export * from './config';

// Decorators exports
export * from './decorators';

// Services exports
export * from './services';

// Entities exports
export * from './entities';

// DTOs exports
export * from './dto';

// Providers exports
export * from './providers';

// Controllers exports
export * from './controllers';

// Types exports
export * from './types';

// Utils exports
export * from './utils';

// Processors exports
export * from './processors';

// Commands exports
export * from './commands';

// Interceptors exports
export * from './interceptors';

// Guards exports
export * from './guards';

// Middleware exports
export * from './middleware';

// Re-export commonly used interfaces for convenience
export type {
  EventTypesConfig,
  EventTypeConfig,
  NotificationChannel
} from './config/event-config.interface';

// Re-export main service for easy access
export { EventEmitterService } from './services/event-emitter.service';


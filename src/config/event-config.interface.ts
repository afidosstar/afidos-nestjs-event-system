export interface FieldSchema {
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    required: boolean;
    validation?: any;
    default?: any;
    description?: string
  }

  export interface RetryPolicy {
    attempts: number;
    delay: number;
    backoff?: 'exponential' | 'linear';
    maxDelay?: number;
  }

  export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  }

  export interface EventTypeConfig {
    description: string;
    schema: Record<string, FieldSchema>;
    defaultProcessing: 'sync' | 'async';
    waitForResult: boolean;
    channels: NotificationChannel[];
    templates?: Record<string, string>;
    retryPolicy?: RetryPolicy;
    rateLimiting?: RateLimitConfig;
    priority?: 'low' | 'normal' | 'high';
    enabled?: boolean;
  }

  export type EventTypesConfig = Record<string, EventTypeConfig>;

  export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'external-service' | 'realtime';

  // Auto-generation of TypeScript types
  export type InferSchemaType<T extends Record<string, FieldSchema>> = {
    [K in keyof T]: T[K]['type'] extends 'string'
      ? string
      : T[K]['type'] extends 'number'
      ? number
      : T[K]['type'] extends 'boolean'
      ? boolean
      : T[K]['type'] extends 'date'
      ? Date
      : any;
  };

  export type InferEventTypes<T extends EventTypesConfig> = {
    [K in keyof T]: InferSchemaType<T[K]['schema']>
  };

import { EventTypesConfig, InferEventTypes } from '../config/event-config.interface';


// Re-export for convenience
export { EventTypesConfig, InferEventTypes };

// Generic event emitter interface
export interface TypedEventEmitter<T extends EventTypesConfig> {
  emit<K extends keyof InferEventTypes<T>>(
    eventType: K,
    payload: InferEventTypes<T>[K],
    options?: EmitOptions
  ): Promise<EventEmissionResult>;
}

export interface EmitOptions {
  waitForResult?: boolean;
  mode?: 'sync' | 'async' | 'auto';
  priority?: 'low' | 'normal' | 'high';
  delay?: number;
  correlationId?: string;
  timeout?: number;
}

export interface EventEmissionResult {
  eventId: string;
  correlationId: string;
  mode: 'sync' | 'async';
  waitedForResult: boolean;
  results?: NotificationResult[];
  queuedAt?: Date;
  processedAt?: Date;
}

export interface NotificationResult {
  channel: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  externalId?: string;
  timestamp: Date;
}



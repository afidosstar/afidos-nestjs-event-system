import { SetMetadata } from '@nestjs/common';
import { EventTypeConfig } from '../config/event-config.interface';

export const EVENT_TYPE_METADATA = 'event-type';

export interface EventTypeDecoratorOptions extends Partial<EventTypeConfig> {
  name: string;
}

export function EventType(name: string, options: Partial<EventTypeConfig> = {}) {
  return function <T extends new (...args: any[]) => {}>(constructor: T) {
    const metadata: EventTypeDecoratorOptions = {
      name,
      ...options,
    };
    
    SetMetadata(EVENT_TYPE_METADATA, metadata)(constructor);
    return constructor;
  };
}
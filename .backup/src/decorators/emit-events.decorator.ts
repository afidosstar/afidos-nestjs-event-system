import { SetMetadata } from '@nestjs/common';

export interface EmitEventsOptions {
  create?: string | boolean;
  update?: string | boolean;
  delete?: string | boolean;
  customEvents?: Record<string, string>;
}

export const EMIT_EVENTS_METADATA = 'emit-events';

export function EmitEvents(options: EmitEventsOptions = {}) {
  return function <T extends new (...args: any[]) => {}>(constructor: T) {
    SetMetadata(EMIT_EVENTS_METADATA, options)(constructor);
    
    // Auto-generate event names if needed
    const className = constructor.name.toLowerCase();
    const defaultOptions: EmitEventsOptions = {
      create: options.create === true ? `${className}.created` : options.create,
      update: options.update === true ? `${className}.updated` : options.update,
      delete: options.delete === true ? `${className}.deleted` : options.delete,
      ...options,
    };
    
    SetMetadata(EMIT_EVENTS_METADATA, defaultOptions)(constructor);
    return constructor;
  };
}
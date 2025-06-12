import { SetMetadata } from '@nestjs/common';

export interface EmitEventOptions {
  eventType: string;
  mode?: 'sync' | 'async' | 'auto';
  waitForResult?: boolean;
  priority?: 'low' | 'normal' | 'high';
  payloadTransform?: (result: any, ...args: any[]) => any;
}

export const EMIT_EVENT_METADATA = 'emit-event';

export function EmitEvent(options: EmitEventOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Get EventEmitterService instance (would be injected in real implementation)
      const eventEmitter = this.eventEmitter;
      
      if (eventEmitter) {
        const payload = options.payloadTransform 
          ? options.payloadTransform(result, ...args)
          : result;

        await eventEmitter.emit(options.eventType, payload, {
          mode: options.mode,
          waitForResult: options.waitForResult,
          priority: options.priority,
        });
      }

      return result;
    };

    SetMetadata(EMIT_EVENT_METADATA, options)(target, propertyKey, descriptor);
    return descriptor;
  };
}
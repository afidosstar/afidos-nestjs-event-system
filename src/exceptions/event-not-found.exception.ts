import { NotFoundException } from '@nestjs/common';

export class EventNotFoundException extends NotFoundException {
  constructor(eventType: string) {
    super(`Event type '${eventType}' not found or disabled`);
  }
}
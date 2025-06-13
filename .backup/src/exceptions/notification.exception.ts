import { InternalServerErrorException } from '@nestjs/common';

export class NotificationException extends InternalServerErrorException {
  constructor(message: string, channel?: string, provider?: string) {
    const fullMessage = channel && provider 
      ? `Notification failed for ${channel}/${provider}: ${message}`
      : `Notification failed: ${message}`;
    super(fullMessage);
  }
}
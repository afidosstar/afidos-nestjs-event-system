import { NotFoundException } from '@nestjs/common';

export class ProviderNotFoundException extends NotFoundException {
  constructor(channel: string, provider?: string) {
    const message = provider 
      ? `Provider '${provider}' for channel '${channel}' not found`
      : `No provider found for channel '${channel}'`;
    super(message);
  }
}

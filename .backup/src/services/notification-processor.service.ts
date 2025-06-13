import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRecipient } from '../entities/event-recipient.entity';
import { NotificationProvider } from '../providers/base/notification-provider.interface';
import {NotificationChannel} from "@/config";
import {NotificationResult} from "@/types";

@Injectable()
export class NotificationProcessorService {
  private readonly logger = new Logger(NotificationProcessorService.name);
  private readonly providers = new Map<string, NotificationProvider>();

  constructor(
    @InjectRepository(EventRecipient)
    private eventRecipientRepository: Repository<EventRecipient>,
    providers: NotificationProvider[]
  ) {
    // Register all providers
    providers.forEach(provider => {
      this.providers.set(`${provider.channel}-${provider.name}`, provider);
    });
  }

  async processNotifications(
    eventType: string,
    payload: any,
    correlationId: string
  ): Promise<NotificationResult[]> {
    const recipients = await this.eventRecipientRepository.find({
      where: { eventTypeName: eventType, enabled: true }
    });

    const results: NotificationResult[] = [];

    for (const recipient of recipients) {
      try {
        const provider = this.getProvider(recipient.channel, recipient.config.driver);
        if (!provider) {
          this.logger.warn(`No provider found for channel ${recipient.channel}`);
          continue;
        }

        const result = await provider.send(payload, {
          recipientType: recipient.recipientType,
          recipientId: recipient.recipientId,
          config: recipient.config,
        });

        results.push(result);
      } catch (error: any) {
        this.logger.error(`Failed to send notification to ${recipient.recipientId}:`, error);
        results.push({
          channel: recipient.channel,
          status: 'failed',
          message: error.message,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  private getProvider(channel: NotificationChannel, driver: string): NotificationProvider | undefined {
    return this.providers.get(`${channel}-${driver}`);
  }
}

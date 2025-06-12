import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../entities/event-type.entity';
import { EventRecipient } from '../entities/event-recipient.entity';

export interface RoutingRule {
  eventType: string;
  channel: string;
  condition?: (payload: any) => boolean;
  recipientResolver: (payload: any) => Promise<string[]>;
}

@Injectable()
export class EventRoutingService {
  private readonly logger = new Logger(EventRoutingService.name);
  private readonly customRules = new Map<string, RoutingRule[]>();

  constructor(
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
    @InjectRepository(EventRecipient)
    private eventRecipientRepository: Repository<EventRecipient>,
  ) {}

  async getRecipientsForEvent(
    eventType: string,
    payload: any
  ): Promise<EventRecipient[]> {
    // Get configured recipients
    const configuredRecipients = await this.eventRecipientRepository.find({
      where: { eventTypeName: eventType, enabled: true }
    });

    // Apply custom routing rules
    const customRecipients = await this.applyCustomRules(eventType, payload);

    // Merge and deduplicate
    const allRecipients = [...configuredRecipients, ...customRecipients];
    return this.deduplicateRecipients(allRecipients);
  }

  registerCustomRule(eventType: string, rule: RoutingRule): void {
    if (!this.customRules.has(eventType)) {
      this.customRules.set(eventType, []);
    }
    this.customRules.get(eventType)!.push(rule);
  }

  private async applyCustomRules(
    eventType: string,
    payload: any
  ): Promise<EventRecipient[]> {
    const rules = this.customRules.get(eventType) || [];
    const recipients: EventRecipient[] = [];

    for (const rule of rules) {
      if (rule.condition && !rule.condition(payload)) {
        continue;
      }

      try {
        const recipientIds = await rule.recipientResolver(payload);
        
        for (const recipientId of recipientIds) {
          recipients.push({
            id: `custom-${Date.now()}-${Math.random()}`,
            eventTypeName: eventType,
            channel: rule.channel as any,
            recipientType: 'user',
            recipientId,
            config: {},
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        this.logger.error(`Error applying custom rule for ${eventType}:`, error);
      }
    }

    return recipients;
  }

  private deduplicateRecipients(recipients: EventRecipient[]): EventRecipient[] {
    const seen = new Set<string>();
    return recipients.filter(recipient => {
      const key = `${recipient.channel}-${recipient.recipientId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

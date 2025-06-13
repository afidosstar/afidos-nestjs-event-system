import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from '../base/notification-provider.interface';
import { SmtpEmailProvider } from '../email/smtp-email.provider';
import { TwilioSmsProvider } from '../sms/twilio-sms.provider';
import { HttpWebhookProvider } from '../webhook/http-webhook.provider';
import { FirebasePushProvider } from '../push/firebase-push.provider';
import { FirebaseLikeProvider } from '../external-service/firebase-like.provider';
import { NotificationProviderConfig } from '../../config/notification-config.interface';

@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);

  createProvider(
    name: string,
    config: NotificationProviderConfig
  ): NotificationProvider | null {
    try {
      switch (config.driver) {
        case 'smtp':
          return new SmtpEmailProvider(config.config as  any);

        case 'twilio':
          return new TwilioSmsProvider(config.config as  any);

        case 'http':
          return new HttpWebhookProvider(config.config as  any);

        case 'firebase':
          return new FirebasePushProvider(config.config as  any);

        case 'firebase-like':
          return new FirebaseLikeProvider(config.config as  any);

        default:
          this.logger.warn(`Unknown provider driver: ${config.driver}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Failed to create provider ${name}:`, error);
      return null;
    }
  }

  validateProviderConfig(
    provider: NotificationProvider,
    config: any
  ): boolean {
    try {
      return provider.validateConfig(config);
    } catch (error) {
      this.logger.error(`Provider config validation failed:`, error);
      return false;
    }
  }
}

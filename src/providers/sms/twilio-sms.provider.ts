import { Injectable } from '@nestjs/common';
import { NotificationProvider, RecipientConfig } from '../base/notification-provider.interface';
import {NotificationChannel} from "@/config";
import {NotificationResult} from "@/types";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

@Injectable()
export class TwilioSmsProvider implements NotificationProvider {
  readonly name = 'twilio';
  readonly channel: NotificationChannel = 'sms';

  constructor(private config: TwilioConfig) {}

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    try {
      const twilioClient = require('twilio')(this.config.accountSid, this.config.authToken);

      const message = await twilioClient.messages.create({
        body: payload.message || JSON.stringify(payload),
        from: this.config.fromNumber,
        to: recipient.recipientId,
      });

      return {
        channel: this.channel,
        status: 'sent',
        externalId: message.sid,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        channel: this.channel,
        status: 'failed',
        message: error.message,
        timestamp: new Date(),
      };
    }
  }

  validateConfig(config: any): boolean {
    return !!(config.accountSid && config.authToken && config.fromNumber);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const twilioClient = require('twilio')(this.config.accountSid, this.config.authToken);
      await twilioClient.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch {
      return false;
    }
  }
}

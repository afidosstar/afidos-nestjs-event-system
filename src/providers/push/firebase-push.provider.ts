import { Injectable } from '@nestjs/common';
import { NotificationProvider, RecipientConfig } from '../base/notification-provider.interface';
import {NotificationChannel} from "@/config";
import {NotificationResult} from "@/types";

interface FirebasePushConfig {
  serverKey: string;
  senderId: string;
}

@Injectable()
export class FirebasePushProvider implements NotificationProvider {
  readonly name = 'firebase';
  readonly channel: NotificationChannel = 'push';

  constructor(private config: FirebasePushConfig) {}

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    try {
      const fcmPayload = {
        to: recipient.recipientId, // FCM token
        notification: {
          title: payload.title || 'Notification',
          body: payload.message || payload.body,
          icon: payload.icon,
          sound: payload.sound || 'default',
        },
        data: payload.data || {},
      };

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${this.config.serverKey}`,
        },
        body: JSON.stringify(fcmPayload),
      });

      if (response.ok) {
        const result: any = await response.json();
        return {
          channel: this.channel,
          status: result.success === 1 ? 'sent' : 'failed',
          externalId: result.multicast_id?.toString(),
          message: result.results?.[0]?.error,
          timestamp: new Date(),
        };
      }

      throw new Error(`FCM API error: ${response.statusText}`);
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
    return !!(config.serverKey && config.senderId);
  }

  async healthCheck(): Promise<boolean> {
    // FCM doesn't have a dedicated health check endpoint
    return !!this.config.serverKey;
  }
}

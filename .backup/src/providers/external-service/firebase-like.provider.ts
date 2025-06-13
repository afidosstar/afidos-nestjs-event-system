import { Injectable } from '@nestjs/common';
import { NotificationProvider, RecipientConfig } from '../base/notification-provider.interface';
import {NotificationResult} from "@/types";
import {NotificationChannel} from "@/config";

interface FirebaseLikeConfig {
  apiKey: string;
  endpoint: string;
  projectId?: string;
}

@Injectable()
export class FirebaseLikeProvider implements NotificationProvider {
  readonly name = 'firebase-like';
  readonly channel: NotificationChannel = 'external-service';

  constructor(private config: FirebaseLikeConfig) {}

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    try {
      const notificationData = {
        recipient: recipient.recipientId,
        type: recipient.recipientType,
        data: payload,
        timestamp: new Date().toISOString(),
        projectId: this.config.projectId,
      };

      const response = await fetch(`${this.config.endpoint}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(notificationData),
      });

      if (response.ok) {
        const result: any = await response.json();
        return {
          channel: this.channel,
          status: 'sent',
          externalId: result.notificationId || `external-${Date.now()}`,
          timestamp: new Date(),
        };
      }

      throw new Error(`External service error: ${response.statusText}`);
    } catch (error) {
      return {
        channel: this.channel,
        status: 'failed',
        message: error.message,
        timestamp: new Date(),
      };
    }
  }

  validateConfig(config: any): boolean {
    return !!(config.apiKey && config.endpoint);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

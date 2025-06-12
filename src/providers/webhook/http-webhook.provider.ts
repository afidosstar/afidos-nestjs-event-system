import { Injectable } from '@nestjs/common';
import { NotificationProvider, RecipientConfig} from '../base/notification-provider.interface';
import {NotificationChannel} from "@/config";
import {NotificationResult} from "@/types";

interface HttpWebhookConfig {
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

@Injectable()
export class HttpWebhookProvider implements NotificationProvider {
  readonly name = 'http';
  readonly channel: NotificationChannel = 'webhook';

  constructor(private config: HttpWebhookConfig) {}

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    const maxRetries = this.config.retries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeHttpRequest(payload, recipient);

        if (response.ok) {
          return {
            channel: this.channel,
            status: 'sent',
            externalId: `webhook-${Date.now()}`,
            timestamp: new Date(),
          };
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    return {
      channel: this.channel,
      status: 'failed',
      message: lastError?.message,
      timestamp: new Date(),
    };
  }

  private async makeHttpRequest(payload: any, recipient: RecipientConfig): Promise<Response> {
    const url = recipient.recipientId;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...recipient.config.headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    };

    return fetch(url, options);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  validateConfig(config: any): boolean {
    return typeof config.timeout === 'number' && typeof config.retries === 'number';
  }

  async healthCheck(): Promise<boolean> {
    return true; // Can't do generic health check for webhooks
  }
}

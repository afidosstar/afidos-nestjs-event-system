import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, RecipientConfig, NotificationResult } from '@afidos/nestjs-event-notifications';

interface CustomEmailConfig {
    apiKey: string;
    apiUrl: string;
    templates?: Record<string, string>;
}

@Injectable()
export class CustomEmailProvider implements NotificationProvider {
    readonly name = 'custom-email';
    readonly channel = 'email' as any;
    private readonly logger = new Logger(CustomEmailProvider.name);

    constructor(private config: CustomEmailConfig) {}

    async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
        try {
            const emailData = {
                to: recipient.recipientId,
                template: this.getTemplate(payload.eventType),
                data: payload,
                personalizations: this.getPersonalizations(payload, recipient),
            };

            const response = await fetch(`${this.config.apiUrl}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify(emailData),
            });

            if (response.ok) {
                const result = await response.json();
                return {
                    channel: this.channel,
                    status: 'sent',
                    externalId: result.messageId,
                    timestamp: new Date(),
                };
            }

            throw new Error(`Custom email API error: ${response.statusText}`);
        } catch (error: any) {
            return {
                channel: this.channel,
                status: 'failed',
                message: error.message,
                timestamp: new Date(),
            };
        }
    }

    private getTemplate(eventType: string): string {
        const templates:Record<string, any> = {
            'user.registered': 'welcome-email',
            'order.placed': 'order-confirmation',
            'payment.completed': 'payment-success',
            'payment.failed': 'payment-failed',
        };

        return templates[eventType] || 'default-notification';
    }

    private getPersonalizations(payload: any, recipient: RecipientConfig): any {
        return {
            language: recipient.config?.language || 'en',
            timezone: recipient.config?.timezone || 'UTC',
            currency: payload.currency || 'USD',
            ...payload,
        };
    }

    validateConfig(config: any): boolean {
        return !!(config.apiKey && config.apiUrl);
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.apiUrl}/health`, {
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

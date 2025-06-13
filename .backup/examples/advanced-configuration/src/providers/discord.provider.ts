import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, RecipientConfig, NotificationResult } from '@afidos/nestjs-event-notifications';

interface DiscordConfig {
    webhookUrl: string;
}

@Injectable()
export class DiscordProvider implements NotificationProvider {
    readonly name = 'discord';
    readonly channel = 'webhook' as any;
    private readonly logger = new Logger(DiscordProvider.name);

    constructor(private config: DiscordConfig) {}

    async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
        try {
            const discordMessage = this.formatDiscordMessage(payload);

            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordMessage),
            });

            if (response.ok) {
                return {
                    channel: this.channel,
                    status: 'sent',
                    externalId: `discord-${Date.now()}`,
                    timestamp: new Date(),
                };
            }

            throw new Error(`Discord API error: ${response.status}`);
        } catch (error) {
            return {
                channel: this.channel,
                status: 'failed',
                message: error.message,
                timestamp: new Date(),
            };
        }
    }

    private formatDiscordMessage(payload: any): any {
        return {
            username: 'Event Notifications',
            avatar_url: 'https://example.com/bot-avatar.png',
            embeds: [{
                title: this.getEventTitle(payload),
                description: this.getEventDescription(payload),
                color: this.getEventColor(payload),
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Event Notification System',
                },
            }],
        };
    }

    private getEventTitle(payload: any): string {
        if (payload.eventType?.includes('user.registered')) return '👤 New User Registration';
        if (payload.eventType?.includes('order.placed')) return '🛒 New Order Placed';
        if (payload.eventType?.includes('payment.completed')) return '💳 Payment Completed';
        if (payload.eventType?.includes('system.error')) return '🚨 System Error';
        return '📢 Event Notification';
    }

    private getEventDescription(payload: any): string {
        if (payload.eventType?.includes('user.registered')) {
            return `New user **${payload.firstName} ${payload.lastName}** (${payload.email}) has registered.`;
        }
        if (payload.eventType?.includes('order.placed')) {
            return `Order **${payload.orderNumber}** placed for **${payload.totalAmount}**.`;
        }
        return payload.message || 'Event notification received.';
    }

    private getEventColor(payload: any): number {
        if (payload.eventType?.includes('error')) return 0xff0000; // Red
        if (payload.eventType?.includes('success') || payload.eventType?.includes('completed')) return 0x00ff00; // Green
        if (payload.eventType?.includes('warning')) return 0xffff00; // Yellow
        return 0x0099ff; // Blue
    }

    validateConfig(config: any): boolean {
        return !!config.webhookUrl;
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(this.config.webhookUrl, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }
}

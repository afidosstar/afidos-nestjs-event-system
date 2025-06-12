import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, RecipientConfig, NotificationResult } from '@afidos/nestjs-event-notifications';

interface SlackConfig {
    webhookUrl: string;
    botToken: string;
    defaultChannel?: string;
}

@Injectable()
export class SlackProvider implements NotificationProvider {
    readonly name = 'slack';
    readonly channel = 'webhook' as any;
    private readonly logger = new Logger(SlackProvider.name);

    constructor(private config: SlackConfig) {}

    async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
        try {
            const slackMessage = this.formatSlackMessage(payload, recipient);

            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.botToken}`,
                },
                body: JSON.stringify(slackMessage),
            });

            if (response.ok) {
                this.logger.log(`Slack message sent to ${recipient.recipientId}`);
                return {
                    channel: this.channel,
                    status: 'sent',
                    externalId: `slack-${Date.now()}`,
                    timestamp: new Date(),
                };
            }

            throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
        } catch (error) {
            this.logger.error(`Failed to send Slack message: ${error.message}`);
            return {
                channel: this.channel,
                status: 'failed',
                message: error.message,
                timestamp: new Date(),
            };
        }
    }

    private formatSlackMessage(payload: any, recipient: RecipientConfig): any {
        const channel = recipient.recipientId || this.config.defaultChannel;

        // Enhanced Slack message formatting
        if (payload.eventType?.includes('user.registered')) {
            return {
                channel,
                username: 'Registration Bot',
                icon_emoji: ':wave:',
                attachments: [{
                    color: 'good',
                    title: '🎉 New User Registration',
                    fields: [
                        { title: 'User', value: `${payload.firstName} ${payload.lastName}`, short: true },
                        { title: 'Email', value: payload.email, short: true },
                        { title: 'Source', value: payload.registrationSource || 'Direct', short: true },
                    ],
                    footer: 'User Registration System',
                    ts: Math.floor(Date.now() / 1000),
                }],
            };
        }

        if (payload.eventType?.includes('system.error.critical')) {
            return {
                channel,
                username: 'System Alert',
                icon_emoji: ':rotating_light:',
                attachments: [{
                    color: 'danger',
                    title: '🚨 Critical System Error',
                    fields: [
                        { title: 'Service', value: payload.service, short: true },
                        { title: 'Error Type', value: payload.errorType, short: true },
                        { title: 'Message', value: payload.message, short: false },
                        { title: 'Affected Users', value: payload.affectedUsers?.toString() || 'Unknown', short: true },
                    ],
                    footer: 'System Monitoring',
                    ts: Math.floor(new Date(payload.occurredAt).getTime() / 1000),
                }],
            };
        }

        // Default message format
        return {
            channel,
            text: payload.message || JSON.stringify(payload, null, 2),
            username: 'Notification Bot',
            icon_emoji: ':bell:',
        };
    }

    validateConfig(config: any): boolean {
        return !!(config.webhookUrl && config.botToken);
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

import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationProvider,
    NotificationResult,
    NotificationContext,
    NotificationChannel
} from '@afidos/nestjs-event-notifications';
import { SlackApi } from 'slack-api';

export interface SlackConfig {
    botToken: string;
    defaultChannel: string;
    username?: string;
    iconEmoji?: string;
}

export interface SlackPayload {
    channel?: string;
    text: string;
    attachments?: any[];
    blocks?: any[];
    threadTs?: string;
}

/**
 * Provider custom pour Slack
 */
@Injectable()
export class SlackProvider implements NotificationProvider {
    readonly name = 'slack';
    readonly channel: NotificationChannel = 'external-service'; // Utiliser le canal le plus proche

    private readonly logger = new Logger(SlackProvider.name);
    private slackApi: SlackApi;

    constructor(private config: SlackConfig) {
        this.slackApi = new SlackApi(config.botToken);
    }

    async send(payload: SlackPayload, context: NotificationContext): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            this.logger.debug('Sending Slack message', {
                correlationId: context.correlationId,
                channel: payload.channel || this.config.defaultChannel
            });

            const result = await this.slackApi.chat.postMessage({
                channel: payload.channel || this.config.defaultChannel,
                text: payload.text,
                username: this.config.username,
                icon_emoji: this.config.iconEmoji,
                attachments: payload.attachments,
                blocks: payload.blocks,
                thread_ts: payload.threadTs
            });

            const duration = Date.now() - startTime;

            return {
                channel: this.channel,
                provider: this.name,
                status: 'sent',
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    messageTs: result.ts,
                    channel: result.channel,
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('Failed to send Slack message', {
                correlationId: context.correlationId,
                error: error.message,
                duration
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: { duration }
            };
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.slackApi.auth.test();
            return true;
        } catch (error) {
            this.logger.warn('Slack health check failed', {
                error: error.message
            });
            return false;
        }
    }

    validateConfig(config: SlackConfig): boolean | string[] {
        const errors: string[] = [];

        if (!config.botToken) {
            errors.push('botToken is required');
        }

        if (!config.defaultChannel) {
            errors.push('defaultChannel is required');
        }

        return errors.length === 0 ? true : errors;
    }
}

import { Injectable, Logger } from '@nestjs/common';
import {
    BaseNotificationProvider,
    RecipientDistribution,
    Recipient,
    NotificationResult,
    NotificationContext,
    InjectableNotifier
} from '@afidos/nestjs-event-notifications';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../../../entities/event-type.entity';
import { TelegramTemplateProvider } from '../../template-providers/telegram-template.provider';

// Extension de l'interface Recipient pour ajouter le support Telegram
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        telegramId?: string;
        telegramUsername?: string;
    }
}

/**
 * Provider Telegram simple utilisant TelegramTemplateProvider
 */
@Injectable()
@InjectableNotifier({
    channel: 'telegram',
    description: 'Provider simple pour notifications Telegram'
})
export class TelegramProvider extends BaseNotificationProvider<'telegram'> {
    private readonly logger = new Logger(TelegramProvider.name);
    private readonly apiUrl: string;
    private readonly timeout: number;

    constructor(
        private readonly templateProvider: TelegramTemplateProvider,
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
    ) {
        super();
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '123456:ABC-DEF';
        this.apiUrl = `https://api.telegram.org/bot${botToken}`;
        this.timeout = parseInt(process.env.TELEGRAM_TIMEOUT || '30000');
    }

    async send(distribution: RecipientDistribution, payload: any, context: NotificationContext): Promise<NotificationResult[]> {
        try {
            // Extraire tous les destinataires avec telegramId
            const allRecipients = this.extractAllRecipients(distribution);
            const telegramRecipients = this.filterRecipientsByProperty(allRecipients, 'telegramId');

            if (telegramRecipients.length === 0) {
                return this.createSkippedResults(context, 'No telegram recipients found');
            }

            // Générer le message via le template provider
            const message = await this.templateProvider.render(context.eventType, payload, context);

            // Envoyer à tous les destinataires
            const results: NotificationResult[] = [];
            for (const recipient of telegramRecipients) {
                const result = await this.sendToRecipient(recipient, message, context);
                results.push(result);
            }

            this.logger.log(`Telegram sent to ${telegramRecipients.length} recipients for event ${context.eventType}`);
            return results;

        } catch (error) {
            this.logger.error(`Failed to send telegram for event ${context.eventType}: ${error.message}`);
            return this.createFailedResults(context, error.message);
        }
    }

    /**
     * Envoie le message à un destinataire Telegram
     */
    private async sendToRecipient(recipient: Recipient, message: string, context: NotificationContext): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            const response = await axios.post(`${this.apiUrl}/sendMessage`, {
                chat_id: recipient.telegramId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            }, {
                timeout: this.timeout
            });

            const duration = Date.now() - startTime;

            if (response.status === 200 && response.data.ok) {
                return this.createSentResult(context, {
                    messageId: response.data.result.message_id,
                    recipientId: recipient.id,
                    chatId: recipient.telegramId,
                    duration
                });
            } else {
                throw new Error(`Telegram API error: ${response.data.description || 'Unknown error'}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            return this.createFailedResult(context, error.message, {
                recipientId: recipient.id,
                chatId: recipient.telegramId,
                duration
            });
        }
    }

    /**
     * Délégation vers le template provider
     */
    async getAvailableTemplates(): Promise<string[]> {
        return this.templateProvider.getAvailableTemplates();
    }

    async hasTemplate(eventType: string): Promise<boolean> {
        return this.templateProvider.hasTemplate(eventType);
    }

    clearTemplateCache(): void {
        this.templateProvider.clearTemplateCache();
    }

    async healthCheck(): Promise<boolean> {
        try {
            // Vérifier l'API Telegram
            const response = await axios.get(`${this.apiUrl}/getMe`, {
                timeout: this.timeout
            });
            const telegramOk = response.status === 200 && response.data.ok;
            
            // Vérifier que les templates sont disponibles
            const templatesAvailable = (await this.getAvailableTemplates()).length > 0;
            
            return telegramOk && templatesAvailable;
        } catch (error) {
            this.logger.error(`Telegram provider health check failed: ${error.message}`);
            return false;
        }
    }

    validateConfig(_config: any): boolean | string[] {
        return true;
    }
}
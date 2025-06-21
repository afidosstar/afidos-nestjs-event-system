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
import { TeamsTemplateProvider } from '../../template-providers/teams-template.provider';

// Extension de l'interface Recipient pour ajouter le support Teams
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        teamsWebhookUrl?: string;
        teamsChannelId?: string;
    }
}

/**
 * Provider Microsoft Teams simple utilisant TeamsTemplateProvider
 */
@Injectable()
@InjectableNotifier({
    channel: 'teams',
    description: 'Provider simple pour notifications Microsoft Teams'
})
export class TeamsProvider extends BaseNotificationProvider<'teams'> {
    private readonly logger = new Logger(TeamsProvider.name);
    private readonly timeout: number;

    constructor(
        private readonly templateProvider: TeamsTemplateProvider,
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
    ) {
        super();
        this.timeout = parseInt(process.env.TEAMS_TIMEOUT || '30000');
    }

    async send(distribution: RecipientDistribution, payload: any, context: NotificationContext): Promise<NotificationResult[]> {
        try {
            // Extraire tous les destinataires avec teamsWebhookUrl
            const allRecipients = this.extractAllRecipients(distribution);
            const teamsRecipients = this.filterRecipientsByProperty(allRecipients, 'teamsWebhookUrl');

            if (teamsRecipients.length === 0) {
                return this.createSkippedResults(context, 'No Teams recipients found');
            }

            // Générer la carte Teams via le template provider
            const teamsCardString = await this.templateProvider.render(context.eventType, payload, context);
            const teamsCard = JSON.parse(teamsCardString);

            // Envoyer à tous les destinataires
            const results: NotificationResult[] = [];
            for (const recipient of teamsRecipients) {
                const result = await this.sendToRecipient(recipient, teamsCard, context);
                results.push(result);
            }

            this.logger.log(`Teams sent to ${teamsRecipients.length} recipients for event ${context.eventType}`);
            return results;

        } catch (error) {
            this.logger.error(`Failed to send Teams notification for event ${context.eventType}: ${error.message}`);
            return this.createFailedResults(context, error.message);
        }
    }

    /**
     * Envoie la notification Teams à un destinataire
     */
    private async sendToRecipient(recipient: Recipient, teamsCard: any, context: NotificationContext): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            const response = await axios.post(recipient.teamsWebhookUrl!, teamsCard, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `${process.env.COMPANY_NAME || 'NotificationSystem'}-Teams/1.0`
                },
                timeout: this.timeout
            });

            const duration = Date.now() - startTime;
            const isSuccess = response.status >= 200 && response.status < 300;

            if (isSuccess) {
                return this.createSentResult(context, {
                    webhookUrl: recipient.teamsWebhookUrl,
                    httpStatus: response.status,
                    responseData: response.data,
                    duration,
                    recipientId: recipient.id,
                    channelId: recipient.teamsChannelId
                });
            } else {
                throw new Error(`Teams API returned non-success status: ${response.status}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            return this.createFailedResult(context, error.message, {
                webhookUrl: recipient.teamsWebhookUrl,
                httpStatus: error.response?.status,
                duration,
                recipientId: recipient.id,
                channelId: recipient.teamsChannelId
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
            // Vérifier que les templates sont disponibles
            return (await this.getAvailableTemplates()).length > 0;
        } catch (error) {
            this.logger.error(`Teams provider health check failed: ${error.message}`);
            return false;
        }
    }

    validateConfig(_config: any): boolean | string[] {
        return true;
    }
}
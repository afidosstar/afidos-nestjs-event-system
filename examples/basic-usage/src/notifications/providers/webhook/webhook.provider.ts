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
import { WebhookTemplateProvider } from '../../template-providers/webhook-template.provider';

// Extension de l'interface Recipient pour ajouter le support webhook
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        webhookUrl?: string;
        webhookHeaders?: Record<string, string>;
    }
}

/**
 * Provider webhook simple utilisant WebhookTemplateProvider
 */
@Injectable()
@InjectableNotifier({
    channel: 'webhook',
    description: 'Provider simple pour notifications webhook'
})
export class WebhookProvider extends BaseNotificationProvider<'webhook'> {
    private readonly logger = new Logger(WebhookProvider.name);
    private readonly timeout: number;

    constructor(
        private readonly templateProvider: WebhookTemplateProvider,
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
    ) {
        super();
        this.timeout = parseInt(process.env.WEBHOOK_TIMEOUT || '30000');
    }

    async send(distribution: RecipientDistribution, payload: any, context: NotificationContext): Promise<NotificationResult[]> {
        try {
            // Extraire tous les destinataires avec webhookUrl
            const allRecipients = this.extractAllRecipients(distribution);
            const webhookRecipients = this.filterRecipientsByProperty(allRecipients, 'webhookUrl');

            if (webhookRecipients.length === 0) {
                return this.createSkippedResults(context, 'No webhook recipients found');
            }

            // Générer le payload JSON via le template provider
            const webhookPayloadString = await this.templateProvider.render(context.eventType, payload, context);
            const webhookPayload = JSON.parse(webhookPayloadString);

            // Envoyer à tous les destinataires
            const results: NotificationResult[] = [];
            for (const recipient of webhookRecipients) {
                const result = await this.sendToRecipient(recipient, webhookPayload, webhookPayloadString, context);
                results.push(result);
            }

            this.logger.log(`Webhook sent to ${webhookRecipients.length} recipients for event ${context.eventType}`);
            return results;

        } catch (error) {
            this.logger.error(`Failed to send webhook for event ${context.eventType}: ${error.message}`);
            return this.createFailedResults(context, error.message);
        }
    }

    /**
     * Envoie le webhook à un destinataire
     */
    private async sendToRecipient(
        recipient: Recipient, 
        webhookPayload: any, 
        webhookPayloadString: string, 
        context: NotificationContext
    ): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            // Préparer les headers avec sécurité
            const securityHeaders = this.templateProvider.createSecurityHeaders(
                webhookPayloadString, 
                process.env.WEBHOOK_SECRET
            );
            
            const headers = {
                ...securityHeaders,
                'X-Event-Type': context.eventType,
                'X-Event-ID': context.eventId,
                'X-Correlation-ID': context.correlationId,
                'X-Recipient-ID': recipient.id || 'unknown',
                'X-Attempt': context.attempt?.toString() || '1',
                ...recipient.webhookHeaders
            };

            const response = await axios.post(recipient.webhookUrl!, webhookPayload, {
                headers,
                timeout: this.timeout
            });

            const duration = Date.now() - startTime;
            const isSuccess = response.status >= 200 && response.status < 300;

            if (isSuccess) {
                return this.createSentResult(context, {
                    webhookUrl: recipient.webhookUrl,
                    httpStatus: response.status,
                    responseHeaders: response.headers,
                    duration,
                    recipientId: recipient.id
                });
            } else {
                throw new Error(`Webhook returned non-success status: ${response.status}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            return this.createFailedResult(context, error.message, {
                webhookUrl: recipient.webhookUrl,
                httpStatus: error.response?.status,
                duration,
                recipientId: recipient.id
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
            this.logger.error(`Webhook provider health check failed: ${error.message}`);
            return false;
        }
    }

    validateConfig(_config: any): boolean | string[] {
        return true;
    }
}
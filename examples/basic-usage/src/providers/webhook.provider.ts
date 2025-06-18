import { Logger } from '@nestjs/common';
import { 
    NotificationProviderBase, 
    HttpDriver, 
    RecipientLoader, 
    Recipient,
    NotificationResult, 
    NotificationContext,
    InjectableNotifier
} from '@afidos/nestjs-event-notifications';

// Extension de l'interface Recipient pour ajouter le support webhook
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        webhookUrl?: string;
        webhookHeaders?: Record<string, string>;
    }
}

export interface WebhookConfig {
    defaultHeaders?: Record<string, string>;
    timeout?: number;
    retryableStatusCodes?: number[];
}

/**
 * Provider webhook utilisant le HttpDriver préconçu
 */
@InjectableNotifier({
    channel: 'webhook',
    driver: 'http',
    description: 'Provider pour notifications webhook via HTTP'
})
export class WebhookProvider extends NotificationProviderBase<'webhookUrl'> {
    protected readonly property = 'webhookUrl';
    private readonly logger = new Logger(WebhookProvider.name);

    constructor(
        recipientLoader: RecipientLoader,
        private readonly httpDriver: HttpDriver,
        private readonly config: WebhookConfig = {}
    ) {
        super(recipientLoader);
    }

    protected async sendToAddress(
        address: string,
        eventType: string,
        payload: any,
        recipient: Recipient,
        context: NotificationContext
    ): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            const webhookPayload = this.buildWebhookPayload(eventType, payload, recipient, context);
            const headers = this.buildHeaders(recipient);

            const response = await this.httpDriver.post(address, webhookPayload, headers);
            const duration = Date.now() - startTime;

            if (this.isSuccessfulResponse(response.status)) {
                this.logger.log(`Webhook sent successfully to ${address} for event ${eventType}`);

                return {
                    channel: this.getChannelName(),
                    provider: this.getProviderName(),
                    status: 'sent',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: {
                        recipientId: recipient.id,
                        webhookUrl: address,
                        duration,
                        httpStatus: response.status,
                        response: response.data
                    }
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.error(`Failed to send webhook to ${address} for event ${eventType}: ${error.message}`);

            return {
                channel: this.getChannelName(),
                provider: this.getProviderName(),
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    recipientId: recipient.id,
                    webhookUrl: address,
                    duration
                }
            };
        }
    }

    /**
     * Construit le payload du webhook
     */
    private buildWebhookPayload(
        eventType: string, 
        payload: any, 
        recipient: Recipient, 
        context: NotificationContext
    ): any {
        return {
            event: {
                type: eventType,
                timestamp: new Date().toISOString(),
                id: context.correlationId,
                attempt: context.attempt
            },
            recipient: {
                id: recipient.id,
                channel: this.getChannelName()
            },
            data: payload,
            metadata: {
                provider: this.getProviderName(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Construit les headers HTTP pour le webhook
     */
    private buildHeaders(recipient: Recipient): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'nestjs-event-notifications/1.0.0',
            'X-Event-Source': 'nestjs-event-notifications',
            ...this.config.defaultHeaders
        };

        // Ajouter les headers spécifiques au destinataire
        if (recipient.webhookHeaders) {
            Object.assign(headers, recipient.webhookHeaders);
        }

        return headers;
    }

    /**
     * Détermine si la réponse HTTP est considérée comme un succès
     */
    private isSuccessfulResponse(status: number): boolean {
        // 2xx = succès
        if (status >= 200 && status < 300) {
            return true;
        }

        // Codes spécifiques configurés comme réussis (ex: 202 Accepted)
        if (this.config.retryableStatusCodes?.includes(status)) {
            return true;
        }

        return false;
    }

    /**
     * Vérifie la santé du provider webhook
     * Teste les webhooks configurés s'ils ont un endpoint de health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Pour un webhook, on peut seulement vérifier que le HttpDriver fonctionne
            return await this.httpDriver.healthCheck();
        } catch (error) {
            this.logger.error(`Webhook provider health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Valide la configuration webhook
     */
    validateConfig(config: WebhookConfig): boolean | string[] {
        const errors: string[] = [];

        if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
            errors.push('timeout must be between 1000 and 60000 milliseconds');
        }

        if (config.retryableStatusCodes) {
            const invalidCodes = config.retryableStatusCodes.filter(code => 
                !Number.isInteger(code) || code < 100 || code > 599
            );
            if (invalidCodes.length > 0) {
                errors.push(`Invalid HTTP status codes: ${invalidCodes.join(', ')}`);
            }
        }

        return errors.length === 0 ? true : errors;
    }

    /**
     * Méthodes utilitaires pour créer des configurations webhook
     */
    static createBasicConfig(headers?: Record<string, string>): WebhookConfig {
        return {
            defaultHeaders: headers,
            timeout: 10000,
            retryableStatusCodes: [202] // Accepted
        };
    }

    static createSlackConfig(): WebhookConfig {
        return {
            defaultHeaders: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };
    }

    static createDiscordConfig(): WebhookConfig {
        return {
            defaultHeaders: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };
    }
}
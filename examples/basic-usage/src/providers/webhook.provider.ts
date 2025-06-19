import { Injectable, Logger } from '@nestjs/common';
import { 
    NotificationProvider, 
    HttpDriver, 
    RecipientLoader, 
    Recipient,
    NotificationResult, 
    NotificationContext,
    InjectableNotifier
} from '@afidos/nestjs-event-notifications';
import { getNotifierMetadata } from '@afidos/nestjs-event-notifications';

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
@Injectable()
export class WebhookProvider implements NotificationProvider {
    readonly name = 'WebhookProvider';
    readonly channel = 'webhook';
    protected readonly property = 'webhookUrl';
    private readonly logger = new Logger(WebhookProvider.name);

    constructor(
        private readonly recipientLoader: RecipientLoader,
        private readonly httpDriver: HttpDriver,
        private readonly config: WebhookConfig = {}
    ) {}

    async send(payload: any, context: NotificationContext): Promise<NotificationResult> {
        try {
            // 1. Charger tous les destinataires pour cet événement
            const allRecipients = await this.recipientLoader.load(context.eventType, payload);

            // 2. Filtrer par la propriété webhookUrl
            const webhookRecipients = this.filterRecipientsByProperty(allRecipients, 'webhookUrl');

            if (webhookRecipients.length === 0) {
                return {
                    channel: this.getChannelName(),
                    provider: this.getProviderName(),
                    status: 'skipped',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: { reason: 'No webhook recipients found' }
                };
            }

            // 3. Prendre le premier recipient
            const recipient = webhookRecipients[0];
            const address = recipient.webhookUrl as string;
            
            return await this.sendToAddress(address, context.eventType, payload, recipient, context);

        } catch (error) {
            return {
                channel: this.getChannelName(),
                provider: this.getProviderName(),
                status: 'failed',
                error: `Failed to send: ${error.message}`,
                sentAt: new Date(),
                attempts: context.attempt
            };
        }
    }

    private async sendToAddress(
        address: string,
        eventType: string,
        payload: any,
        recipient: Recipient,
        context: NotificationContext
    ): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            // Préparer les headers
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'nestjs-event-notifications/1.0.3',
                'X-Event-Type': eventType,
                'X-Event-ID': context.eventId,
                'X-Correlation-ID': context.correlationId,
                'X-Recipient-ID': recipient.id || 'unknown',
                ...this.config.defaultHeaders,
                ...recipient.webhookHeaders
            };

            // Préparer le body de la webhook
            const webhookPayload = {
                event: {
                    type: eventType,
                    id: context.eventId,
                    correlationId: context.correlationId,
                    timestamp: new Date().toISOString(),
                    attempt: context.attempt
                },
                data: payload,
                recipient: {
                    id: recipient.id,
                    preferences: recipient.preferences
                }
            };

            const response = await this.httpDriver.post(address, webhookPayload, {
                headers,
                timeout: this.config.timeout || 30000
            });

            const duration = Date.now() - startTime;
            const isSuccess = response.status >= 200 && response.status < 300;

            if (isSuccess) {
                this.logger.log(`Webhook sent successfully to ${address} for event ${eventType} (${response.status})`);

                return {
                    channel: this.getChannelName(),
                    provider: this.getProviderName(),
                    status: 'sent',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: {
                        webhookUrl: address,
                        httpStatus: response.status,
                        responseHeaders: response.headers,
                        responseSize: JSON.stringify(response.data).length,
                        duration,
                        recipientId: recipient.id
                    }
                };
            } else {
                throw new Error(`Webhook returned non-success status: ${response.status}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(`Failed to send webhook to ${address} for event ${eventType}: ${error.message}`);

            // Déterminer si l'erreur est "retryable"
            const isRetryable = this.isRetryableError(error);

            return {
                channel: this.getChannelName(),
                provider: this.getProviderName(),
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    webhookUrl: address,
                    httpStatus: error.response?.status,
                    isRetryable,
                    duration,
                    recipientId: recipient.id,
                    errorCode: error.code
                }
            };
        }
    }

    /**
     * Filtre les recipients qui ont une adresse pour une propriété donnée
     */
    private filterRecipientsByProperty<K extends keyof Recipient>(
        recipients: Recipient[],
        property: K
    ): Recipient[] {
        return recipients.filter(recipient => {
            const address = recipient[property];
            return address !== undefined && address !== null && address !== '';
        });
    }

    /**
     * Retourne le nom du provider pour les logs et métadonnées
     */
    private getProviderName(): string {
        return this.constructor.name;
    }

    /**
     * Récupère le nom du canal depuis les métadonnées du décorateur @InjectableNotifier
     */
    private getChannelName(): string {
        const metadata = getNotifierMetadata(this.constructor);
        return metadata?.channel || 'unknown';
    }

    /**
     * Détermine si une erreur est "retryable" (utile pour les systèmes de retry)
     */
    private isRetryableError(error: any): boolean {
        // Erreurs réseau (timeout, connexion, etc.)
        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return true;
        }

        // Status codes HTTP retryables (5xx server errors)
        if (error.response?.status) {
            const status = error.response.status;
            const defaultRetryableCodes = [429, 500, 502, 503, 504];
            const retryableCodes = this.config.retryableStatusCodes || defaultRetryableCodes;
            return retryableCodes.includes(status);
        }

        return false;
    }

    /**
     * Vérifie la santé du provider webhook
     */
    async healthCheck(): Promise<boolean> {
        // Pour webhook, on considère que c'est toujours "healthy" 
        // car on ne peut pas tester une URL générique
        return true;
    }

    /**
     * Valide la configuration webhook
     */
    validateConfig(config: WebhookConfig): boolean | string[] {
        const errors: string[] = [];

        if (config.timeout && (config.timeout < 1000 || config.timeout > 120000)) {
            errors.push('timeout must be between 1000 and 120000 milliseconds');
        }

        if (config.retryableStatusCodes) {
            const validStatusCodes = config.retryableStatusCodes.every(code => 
                Number.isInteger(code) && code >= 100 && code < 600
            );
            if (!validStatusCodes) {
                errors.push('retryableStatusCodes must contain valid HTTP status codes (100-599)');
            }
        }

        if (config.defaultHeaders) {
            const hasInvalidHeaders = Object.keys(config.defaultHeaders).some(key => 
                !key || typeof key !== 'string'
            );
            if (hasInvalidHeaders) {
                errors.push('defaultHeaders must have valid string keys');
            }
        }

        return errors.length === 0 ? true : errors;
    }

    /**
     * Méthodes utilitaires pour webhook
     */
    static createWebhookPayload(eventType: string, data: any, metadata: any = {}) {
        return {
            event: {
                type: eventType,
                timestamp: new Date().toISOString(),
                ...metadata
            },
            data
        };
    }

    static createSecureHeaders(secret?: string) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'nestjs-event-notifications/1.0.3'
        };

        if (secret) {
            // Simple exemple de signature (en production, utiliser HMAC-SHA256)
            headers['X-Webhook-Signature'] = Buffer.from(secret).toString('base64');
        }

        return headers;
    }
}
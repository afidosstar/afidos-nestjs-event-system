import {NotificationChannel, NotificationContext, NotificationProvider, NotificationResult} from "@/types/interfaces";
import axios, {AxiosInstance} from "axios";
import {Injectable, Logger} from "@nestjs/common";

export interface ExternalServiceConfig {
    endpoint: string;
    apiKey: string;
    timeout?: number;
    batchSize?: number;
}

export interface ExternalServicePayload {
    recipients: Array<{
        userId: string;
        deviceTokens?: string[];
        preferences?: Record<string, any>;
    }>;
    notification: {
        title: string;
        body: string;
        data?: Record<string, any>;
        badge?: number;
        sound?: string;
        category?: string;
    };
    options?: {
        priority?: 'high' | 'normal';
        timeToLive?: number;
        collapseKey?: string;
    };
}

/**
 * Provider pour service externe (type Firebase, Pusher, etc.)
 */
@Injectable()
export class ExternalServiceProvider implements NotificationProvider {
    readonly name = 'firebase-like';
    readonly channel: NotificationChannel = 'external-service';

    private readonly logger = new Logger(ExternalServiceProvider.name);
    private readonly httpClient: AxiosInstance;

    constructor(private config: ExternalServiceConfig) {
        this.httpClient = axios.create({
            baseURL: this.config.endpoint,
            timeout: this.config.timeout || 15000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
                'User-Agent': '@afidos/nestjs-event-notifications'
            }
        });
    }

    /**
     * Envoyer une notification via le service externe
     */
    async send(payload: ExternalServicePayload, context: NotificationContext): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            this.logger.debug('Sending external service notification', {
                correlationId: context.correlationId,
                recipientCount: payload.recipients.length,
                attempt: context.attempt
            });

            // Diviser en batches si nécessaire
            const batchSize = this.config.batchSize || 500;
            const batches = this.createBatches(payload.recipients, batchSize);
            const results = [];

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchPayload = {
                    ...payload,
                    recipients: batch,
                    metadata: {
                        correlationId: context.correlationId,
                        eventType: context.eventType,
                        batch: i + 1,
                        totalBatches: batches.length
                    }
                };

                const response = await this.httpClient.post('/send', batchPayload);
                results.push(response.data);
            }

            const duration = Date.now() - startTime;

            this.logger.debug('External service notification sent successfully', {
                correlationId: context.correlationId,
                batchCount: batches.length,
                duration
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'sent',
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    batchCount: batches.length,
                    totalRecipients: payload.recipients.length,
                    duration,
                    results
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('Failed to send external service notification', {
                correlationId: context.correlationId,
                error: error.message,
                statusCode: error.response?.status,
                duration,
                attempt: context.attempt
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    duration,
                    statusCode: error.response?.status,
                    responseData: error.response?.data
                }
            };
        }
    }

    /**
     * Créer des batches pour le traitement par lots
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Vérifier la santé du provider
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.httpClient.get('/health');
            return response.status === 200;
        } catch (error) {
            this.logger.warn('External service health check failed', {
                error: error.message,
                endpoint: this.config.endpoint
            });
            return false;
        }
    }

    /**
     * Valider la configuration
     */
    validateConfig(config: ExternalServiceConfig): boolean | string[] {
        const errors: string[] = [];

        if (!config.endpoint) {
            errors.push('endpoint is required');
        } else {
            try {
                new URL(config.endpoint);
            } catch {
                errors.push('endpoint must be a valid URL');
            }
        }

        if (!config.apiKey) {
            errors.push('apiKey is required');
        }

        if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
            errors.push('timeout must be between 1s and 60s');
        }

        if (config.batchSize && (config.batchSize < 1 || config.batchSize > 1000)) {
            errors.push('batchSize must be between 1 and 1000');
        }

        return errors.length === 0 ? true : errors;
    }
}

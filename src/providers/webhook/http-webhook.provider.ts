import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {Injectable, Logger} from "@nestjs/common";
import {NotificationChannel, NotificationContext, NotificationProvider, NotificationResult} from "@/types/interfaces";

export interface WebhookConfig {
    endpoint: string;
    method?: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    timeout?: number;
    retryableStatusCodes?: number[];
    auth?: {
        type: 'bearer' | 'basic' | 'apikey';
        token?: string;
        username?: string;
        password?: string;
        apiKey?: string;
        apiKeyHeader?: string;
    };
}

export interface WebhookPayload {
    url?: string; // Override de l'URL configurée
    data: any;
    headers?: Record<string, string>; // Headers additionnels
}

/**
 * Provider HTTP pour l'envoi de webhooks
 */
@Injectable()
export class HttpWebhookProvider implements NotificationProvider {
    readonly name = 'http';
    readonly channel: NotificationChannel = 'webhook';

    private readonly logger = new Logger(HttpWebhookProvider.name);
    private readonly httpClient: AxiosInstance;

    constructor(private config: WebhookConfig) {
        this.httpClient = this.createHttpClient();
    }

    /**
     * Créer le client HTTP avec la configuration
     */
    private createHttpClient(): AxiosInstance {
        const client = axios.create({
            timeout: this.config.timeout || 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': '@afidos/nestjs-event-notifications',
                ...this.config.headers
            }
        });

        // Ajouter l'authentification
        if (this.config.auth) {
            this.setupAuthentication(client);
        }

        return client;
    }

    /**
     * Configurer l'authentification
     */
    private setupAuthentication(client: AxiosInstance): void {
        const { auth } = this.config;

        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    client.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
                }
                break;

            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    client.defaults.headers.common['Authorization'] = `Basic ${credentials}`;
                }
                break;

            case 'apikey':
                if (auth.apiKey) {
                    const headerName = auth.apiKeyHeader || 'X-API-Key';
                    client.defaults.headers.common[headerName] = auth.apiKey;
                }
                break;
        }
    }

    /**
     * Envoyer un webhook
     */
    async send(payload: WebhookPayload, context: NotificationContext): Promise<NotificationResult> {
        const startTime = Date.now();
        const url = payload.url || this.config.endpoint;
        const method = this.config.method || 'POST';

        try {
            this.logger.debug('Sending webhook', {
                correlationId: context.correlationId,
                url,
                method,
                attempt: context.attempt
            });

            // Préparer les headers
            const headers = {
                'X-Correlation-ID': context.correlationId,
                'X-Event-Type': context.eventType,
                'X-Attempt': context.attempt.toString(),
                ...payload.headers
            };

            // Envoyer la requête
            const response: AxiosResponse = await this.httpClient.request({
                method,
                url,
                data: payload.data,
                headers
            });

            const duration = Date.now() - startTime;

            this.logger.debug('Webhook sent successfully', {
                correlationId: context.correlationId,
                url,
                statusCode: response.status,
                duration
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'sent',
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    url,
                    method,
                    statusCode: response.status,
                    duration,
                    responseHeaders: response.headers
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('Failed to send webhook', {
                correlationId: context.correlationId,
                url,
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
                    url,
                    method,
                    statusCode: error.response?.status,
                    duration
                }
            };
        }
    }

    /**
     * Vérifier la santé du provider
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Faire une requête HEAD ou GET simple pour vérifier la connectivité
            const response = await this.httpClient.request({
                method: 'HEAD',
                url: this.config.endpoint,
                timeout: 5000
            });

            return response.status < 500;
        } catch (error) {
            this.logger.warn('Webhook health check failed', {
                error: error.message,
                endpoint: this.config.endpoint,
                statusCode: error.response?.status
            });

            // Si c'est une erreur 4xx, le service fonctionne mais refuse la requête
            return error.response?.status < 500;
        }
    }

    /**
     * Valider la configuration
     */
    validateConfig(config: WebhookConfig): boolean | string[] {
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

        if (config.method && !['POST', 'PUT', 'PATCH'].includes(config.method)) {
            errors.push('method must be POST, PUT, or PATCH');
        }

        if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
            errors.push('timeout must be between 1s and 60s');
        }

        if (config.auth) {
            const authErrors = this.validateAuthConfig(config.auth);
            errors.push(...authErrors);
        }

        return errors.length === 0 ? true : errors;
    }

    /**
     * Valider la configuration d'authentification
     */
    private validateAuthConfig(auth: WebhookConfig['auth']): string[] {
        const errors: string[] = [];

        if (!['bearer', 'basic', 'apikey'].includes(auth.type)) {
            errors.push('auth.type must be bearer, basic, or apikey');
            return errors;
        }

        switch (auth.type) {
            case 'bearer':
                if (!auth.token) errors.push('auth.token is required for bearer authentication');
                break;

            case 'basic':
                if (!auth.username) errors.push('auth.username is required for basic authentication');
                if (!auth.password) errors.push('auth.password is required for basic authentication');
                break;

            case 'apikey':
                if (!auth.apiKey) errors.push('auth.apiKey is required for apikey authentication');
                break;
        }

        return errors;
    }
}

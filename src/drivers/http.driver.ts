import { Injectable, Logger } from '@nestjs/common';

// Augmentation du module pour enregistrer la configuration HTTP
declare module '../types/interfaces' {
    interface DriverConfigurations {
        'http': HttpDriverConfig;
    }
}

export interface HttpDriverConfig {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
}

export interface HttpRequest {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    data: any;
    headers: Record<string, string>;
}

/**
 * Driver HTTP préconçu pour toutes les communications HTTP
 * Utilisé par les providers pour communiquer avec les APIs externes
 */
@Injectable()
export class HttpDriver {
    private readonly logger = new Logger(HttpDriver.name);

    constructor(private readonly config: HttpDriverConfig = {}) {}

    /**
     * Envoie une requête HTTP
     */
    async send(request: HttpRequest): Promise<HttpResponse> {
        const startTime = Date.now();
        const timeout = this.config.timeout || 10000;
        const method = request.method || 'POST';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            this.logger.debug(`Sending ${method} request to ${request.url}`);

            const response = await fetch(request.url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'nestjs-event-notifications/1.0.0',
                    ...this.config.headers,
                    ...request.headers
                },
                body: request.body ? JSON.stringify(request.body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await this.parseResponse(response);
            const duration = Date.now() - startTime;

            this.logger.debug(`HTTP request completed in ${duration}ms with status ${response.status}`);

            return {
                status: response.status,
                statusText: response.statusText,
                data,
                headers: this.headersToObject(response.headers)
            };

        } catch (error) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (error.name === 'AbortError') {
                this.logger.error(`HTTP request timeout after ${timeout}ms`);
                throw new Error(`Request timeout after ${timeout}ms`);
            }

            this.logger.error(`HTTP request failed after ${duration}ms: ${error.message}`);
            throw error;
        }
    }

    /**
     * Envoie une requête POST (méthode de convenance)
     */
    async post(url: string, body: any, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.send({
            url,
            method: 'POST',
            body,
            headers
        });
    }

    /**
     * Envoie une requête GET (méthode de convenance)
     */
    async get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.send({
            url,
            method: 'GET',
            headers
        });
    }

    /**
     * Parse la réponse selon le Content-Type
     */
    private async parseResponse(response: Response): Promise<any> {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return await response.json();
        }

        if (contentType.includes('text/')) {
            return await response.text();
        }

        // Fallback pour les réponses binaires ou autres
        return await response.arrayBuffer();
    }

    /**
     * Convertit les headers de Response en objet simple
     */
    private headersToObject(headers: Headers): Record<string, string> {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Vérifie la santé du driver (test de connectivité)
     */
    async healthCheck(testUrl?: string): Promise<boolean> {
        try {
            const url = testUrl || 'https://httpbin.org/status/200';
            const response = await this.get(url);
            return response.status >= 200 && response.status < 300;
        } catch (error) {
            this.logger.warn(`HTTP driver health check failed: ${error.message}`);
            return false;
        }
    }
}
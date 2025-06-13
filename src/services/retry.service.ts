import { Injectable, Logger } from '@nestjs/common';
import { NotificationResult, RetryPolicy } from '@/types/interfaces';

/**
 * Service de gestion des politiques de retry
 */
@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    /**
     * Politique de retry par défaut
     */
    private readonly defaultRetryPolicy: RetryPolicy = {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffFactor: 2,
        maxDelay: 30000
    };

    /**
     * Exécuter une fonction avec retry automatique
     */
    async execute<T>(
        fn: () => Promise<T>,
        maxAttempts: number = this.defaultRetryPolicy.maxAttempts,
        context?: {
            correlationId?: string;
            eventType?: string;
            channel?: string;
            provider?: string;
        },
        retryPolicy?: Partial<RetryPolicy>
    ): Promise<T> {
        const policy = { ...this.defaultRetryPolicy, ...retryPolicy };
        let lastError: Error;
        let attempt = 1;

        while (attempt <= maxAttempts) {
            try {
                this.logger.debug(`Executing function`, {
                    attempt,
                    maxAttempts,
                    ...context
                });

                const result = await fn();

                if (attempt > 1) {
                    this.logger.debug(`Function succeeded after retry`, {
                        attempt,
                        totalAttempts: attempt,
                        ...context
                    });
                }

                return result;

            } catch (error) {
                lastError = error;

                this.logger.warn(`Function execution failed`, {
                    attempt,
                    maxAttempts,
                    error: error.message,
                    ...context
                });

                // Si c'est le dernier essai, on lance l'erreur
                if (attempt >= maxAttempts) {
                    this.logger.error(`All retry attempts exhausted`, {
                        totalAttempts: attempt,
                        finalError: error.message,
                        ...context
                    });
                    break;
                }

                // Calculer le délai pour le prochain essai
                const delay = this.calculateDelay(attempt, policy);

                this.logger.debug(`Retrying in ${delay}ms`, {
                    attempt,
                    nextAttempt: attempt + 1,
                    delay,
                    ...context
                });

                // Attendre avant le prochain essai
                await this.sleep(delay);
                attempt++;
            }
        }

        throw lastError;
    }

    /**
     * Exécuter avec retry et retourner un NotificationResult
     */
    async executeWithResult(
        fn: () => Promise<NotificationResult>,
        maxAttempts: number = this.defaultRetryPolicy.maxAttempts,
        context?: {
            correlationId?: string;
            eventType?: string;
            channel?: string;
            provider?: string;
        },
        retryPolicy?: Partial<RetryPolicy>
    ): Promise<NotificationResult> {
        const policy = { ...this.defaultRetryPolicy, ...retryPolicy };
        let lastResult: NotificationResult | null = null;
        let attempt = 1;

        while (attempt <= maxAttempts) {
            try {
                this.logger.debug(`Executing notification function`, {
                    attempt,
                    maxAttempts,
                    ...context
                });

                const result = await fn();

                // Vérifier si le résultat indique un succès
                if (result.status === 'sent') {
                    if (attempt > 1) {
                        this.logger.debug(`Notification succeeded after retry`, {
                            attempt,
                            totalAttempts: attempt,
                            ...context
                        });
                    }

                    return {
                        ...result,
                        attempts: attempt
                    };
                }

                // Si le statut n'est pas 'sent', traiter comme un échec
                lastResult = result;
                throw new Error(result.error || 'Notification failed');

            } catch (error) {
                this.logger.warn(`Notification attempt failed`, {
                    attempt,
                    maxAttempts,
                    error: error.message,
                    ...context
                });

                // Si c'est le dernier essai, retourner le résultat d'échec
                if (attempt >= maxAttempts) {
                    this.logger.error(`All notification retry attempts exhausted`, {
                        totalAttempts: attempt,
                        finalError: error.message,
                        ...context
                    });

                    return lastResult || {
                        channel: (context?.channel as any) || 'unknown',
                        provider: context?.provider || 'unknown',
                        status: 'failed',
                        error: error.message,
                        sentAt: new Date(),
                        attempts: attempt
                    };
                }

                // Calculer le délai pour le prochain essai
                const delay = this.calculateDelay(attempt, policy);
                const nextRetryAt = new Date(Date.now() + delay);

                this.logger.debug(`Retrying notification in ${delay}ms`, {
                    attempt,
                    nextAttempt: attempt + 1,
                    delay,
                    nextRetryAt,
                    ...context
                });

                // Mettre à jour le résultat avec les infos de retry
                if (lastResult) {
                    lastResult.attempts = attempt;
                    lastResult.nextRetryAt = nextRetryAt;
                    lastResult.status = 'retrying';
                }

                // Attendre avant le prochain essai
                await this.sleep(delay);
                attempt++;
            }
        }

        // Cette ligne ne devrait jamais être atteinte
        throw new Error('Unexpected retry loop exit');
    }

    /**
     * Calculer le délai pour le prochain essai avec exponential backoff
     */
    private calculateDelay(attempt: number, policy: RetryPolicy): number {
        if (policy.customDelayFunction) {
            return policy.customDelayFunction(attempt);
        }

        // Exponential backoff: delay = initialDelay * (backoffFactor ^ (attempt - 1))
        const exponentialDelay = policy.initialDelay * Math.pow(policy.backoffFactor, attempt - 1);

        // Ajouter un peu de jitter pour éviter le thundering herd
        const jitter = Math.random() * 0.1 * exponentialDelay;
        const delayWithJitter = exponentialDelay + jitter;

        // Limiter au délai maximum
        return Math.min(delayWithJitter, policy.maxDelay);
    }

    /**
     * Attendre un délai spécifié
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Déterminer si une erreur est temporaire et peut être retryée
     */
    isRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();

        // Erreurs réseau temporaires
        const networkErrors = [
            'econnreset',
            'econnrefused',
            'enotfound',
            'timeout',
            'socket hang up',
            'network error'
        ];

        // Codes d'erreur HTTP temporaires
        const retryableHttpCodes = [
            '408', // Request Timeout
            '429', // Too Many Requests
            '500', // Internal Server Error
            '502', // Bad Gateway
            '503', // Service Unavailable
            '504'  // Gateway Timeout
        ];

        // Vérifier les erreurs réseau
        for (const networkError of networkErrors) {
            if (message.includes(networkError)) {
                return true;
            }
        }

        // Vérifier les codes HTTP
        for (const code of retryableHttpCodes) {
            if (message.includes(code)) {
                return true;
            }
        }

        // Erreurs spécifiques aux providers
        if (message.includes('rate limit') ||
            message.includes('throttled') ||
            message.includes('quota exceeded')) {
            return true;
        }

        return false;
    }

    /**
     * Créer une politique de retry personnalisée
     */
    createRetryPolicy(options: Partial<RetryPolicy>): RetryPolicy {
        return {
            ...this.defaultRetryPolicy,
            ...options
        };
    }

    /**
     * Calculer le délai total pour tous les essais
     */
    calculateTotalDelay(maxAttempts: number, policy?: Partial<RetryPolicy>): number {
        const fullPolicy = { ...this.defaultRetryPolicy, ...policy };
        let totalDelay = 0;

        for (let attempt = 1; attempt < maxAttempts; attempt++) {
            totalDelay += this.calculateDelay(attempt, fullPolicy);
        }

        return totalDelay;
    }

    /**
     * Obtenir des statistiques sur les retry
     */
    getRetryStats(): {
        defaultPolicy: RetryPolicy;
        averageDelayCalculation: (attempts: number) => number;
    } {
        return {
            defaultPolicy: { ...this.defaultRetryPolicy },
            averageDelayCalculation: (attempts: number) => {
                return this.calculateTotalDelay(attempts) / Math.max(1, attempts - 1);
            }
        };
    }

    /**
     * Valider une politique de retry
     */
    validateRetryPolicy(policy: Partial<RetryPolicy>): string[] {
        const errors: string[] = [];

        if (policy.maxAttempts !== undefined) {
            if (policy.maxAttempts < 1 || policy.maxAttempts > 10) {
                errors.push('maxAttempts must be between 1 and 10');
            }
        }

        if (policy.initialDelay !== undefined) {
            if (policy.initialDelay < 100 || policy.initialDelay > 60000) {
                errors.push('initialDelay must be between 100ms and 60s');
            }
        }

        if (policy.backoffFactor !== undefined) {
            if (policy.backoffFactor < 1 || policy.backoffFactor > 5) {
                errors.push('backoffFactor must be between 1 and 5');
            }
        }

        if (policy.maxDelay !== undefined) {
            if (policy.maxDelay < 1000 || policy.maxDelay > 300000) {
                errors.push('maxDelay must be between 1s and 5m');
            }
        }

        if (policy.initialDelay !== undefined && policy.maxDelay !== undefined) {
            if (policy.initialDelay > policy.maxDelay) {
                errors.push('initialDelay cannot be greater than maxDelay');
            }
        }

        return errors;
    }
}

import {Inject, Injectable, Logger} from '@nestjs/common';
import {
    NotificationProvider,
    NotificationResult,
    NotificationContext,
    EventTypesConfig,
    NotificationChannel,
    EventTypeConfig,
    EventPayloads
} from '../types/interfaces';
import { RetryService } from './retry.service';
import {EVENT_TYPES_CONFIG} from "../module/event-notifications.module";

/**
 * Service de routage et coordination des notifications multi-canal
 */
@Injectable()
export class EventRoutingService {
    private readonly logger = new Logger(EventRoutingService.name);
    private readonly providers = new Map<NotificationChannel, NotificationProvider[]>();

    constructor(
        @Inject(EVENT_TYPES_CONFIG) private readonly eventConfig: EventTypesConfig<EventPayloads>,
        private readonly retryService: RetryService
    ) {}

    /**
     * Enregistrer un provider pour un canal
     */
    registerProvider(provider: NotificationProvider): void {
        if (!this.providers.has(provider.channel)) {
            this.providers.set(provider.channel, []);
        }

        const channelProviders = this.providers.get(provider.channel)!;

        // Éviter les doublons
        const existingIndex = channelProviders.findIndex(p => p.name === provider.name);
        if (existingIndex >= 0) {
            channelProviders[existingIndex] = provider;
            this.logger.debug(`Updated provider: ${provider.name} for channel: ${provider.channel}`);
        } else {
            channelProviders.push(provider);
            this.logger.debug(`Registered provider: ${provider.name} for channel: ${provider.channel}`);
        }
    }

    /**
     * Traiter un événement avec coordination multi-canal
     */
    async processEvent(
        eventType: string,
        payload: any,
        context: NotificationContext
    ): Promise<NotificationResult[]> {
        const config = this.getEventConfig(eventType);
        if (!config) {
            throw new Error(`Event type '${eventType}' is not configured`);
        }

        this.logger.debug(`Processing event: ${eventType}`, {
            correlationId: context.correlationId,
            channels: config.channels,
            attempt: context.attempt
        });

        // Traitement parallèle de tous les canaux
        const channelPromises = config.channels.map(channel =>
            this.processChannel(channel, payload, context, config)
                .catch(error => {
                    this.logger.error(`Channel processing failed: ${channel}`, {
                        correlationId: context.correlationId,
                        eventType,
                        error: error.message
                    });

                    // Retourner un résultat d'échec plutôt que de faire échouer tout
                    return {
                        channel,
                        provider: 'unknown',
                        status: 'failed' as const,
                        error: error.message,
                        sentAt: new Date(),
                        attempts: context.attempt
                    };
                })
        );

        const results = await Promise.all(channelPromises);

        // Log du résumé
        const successCount = results.filter(r => r.status === 'sent').length;
        const failureCount = results.filter(r => r.status === 'failed').length;

        this.logger.debug(`Event processing completed: ${eventType}`, {
            correlationId: context.correlationId,
            totalChannels: config.channels.length,
            successful: successCount,
            failed: failureCount
        });

        return results;
    }

    /**
     * Traiter un canal spécifique
     */
    private async processChannel(
        channel: NotificationChannel,
        payload: any,
        context: NotificationContext,
        config: EventTypeConfig
    ): Promise<NotificationResult> {
        const providers = this.providers.get(channel);
        if (!providers || providers.length === 0) {
            throw new Error(`No providers available for channel: ${channel}`);
        }

        // Sélectionner le premier provider disponible (peut être étendu avec load balancing)
        const provider = await this.selectProvider(providers);
        if (!provider) {
            throw new Error(`No healthy provider available for channel: ${channel}`);
        }

        this.logger.debug(`Processing channel: ${channel} with provider: ${provider.name}`, {
            correlationId: context.correlationId,
            attempt: context.attempt
        });

        // Traitement avec retry
        return this.retryService.execute(
            () => this.sendNotification(provider, payload, context),
            config.retryAttempts || 3,
            {
                correlationId: context.correlationId,
                eventType: context.eventType,
                channel,
                provider: provider.name
            }
        );
    }

    /**
     * Sélectionner un provider disponible
     */
    private async selectProvider(providers: NotificationProvider[]): Promise<NotificationProvider | null> {
        // Pour l'instant, sélection simple du premier provider healthy
        // Peut être étendu avec load balancing, circuit breaker, etc.
        for (const provider of providers) {
            try {
                const isHealthy = await provider.healthCheck();
                if (isHealthy) {
                    return provider;
                }
            } catch (error) {
                this.logger.warn(`Health check failed for provider: ${provider.name}`, {
                    error: error.message
                });
            }
        }

        return null;
    }

    /**
     * Envoyer une notification via un provider
     */
    private async sendNotification(
        provider: NotificationProvider,
        payload: any,
        context: NotificationContext
    ): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            const result = await provider.send(payload, context);
            const duration = Date.now() - startTime;

            this.logger.debug(`Notification sent successfully`, {
                provider: provider.name,
                channel: provider.channel,
                correlationId: context.correlationId,
                duration
            });

            return {
                ...result,
                attempts: context.attempt,
                metadata: {
                    ...result.metadata,
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(`Notification sending failed`, {
                provider: provider.name,
                channel: provider.channel,
                correlationId: context.correlationId,
                error: error.message,
                duration
            });

            return {
                channel: provider.channel,
                provider: provider.name,
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: { duration }
            };
        }
    }

    /**
     * Obtenir la configuration d'un type d'événement
     */
    private getEventConfig(eventType: string): EventTypeConfig | null {
        return this.eventConfig[eventType as keyof EventPayloads] || null;
    }

    /**
     * Obtenir tous les providers d'un canal
     */
    getProviders(channel: NotificationChannel): NotificationProvider[] {
        return this.providers.get(channel) || [];
    }

    /**
     * Obtenir tous les canaux supportés
     */
    getSupportedChannels(): NotificationChannel[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Vérifier la santé de tous les providers
     */
    async healthCheck(): Promise<boolean> {
        const allProviders = Array.from(this.providers.values()).flat();

        if (allProviders.length === 0) {
            this.logger.warn('No providers registered');
            return false;
        }

        const healthPromises = allProviders.map(async provider => {
            try {
                return await provider.healthCheck();
            } catch {
                return false;
            }
        });

        const healthResults = await Promise.all(healthPromises);
        const healthyCount = healthResults.filter(Boolean).length;

        // Au moins un provider doit être healthy
        return healthyCount > 0;
    }

    /**
     * Obtenir les statistiques des providers
     */
    async getProvidersStats(): Promise<Record<string, any>> {
        const stats: Record<string, any> = {};

        for (const [channel, providers] of this.providers.entries()) {
            stats[channel] = [];

            for (const provider of providers) {
                try {
                    const isHealthy = await provider.healthCheck();
                    stats[channel].push({
                        name: provider.name,
                        healthy: isHealthy,
                        lastCheck: new Date()
                    });
                } catch (error) {
                    stats[channel].push({
                        name: provider.name,
                        healthy: false,
                        error: error.message,
                        lastCheck: new Date()
                    });
                }
            }
        }

        return stats;
    }

    /**
     * Désinscrire un provider
     */
    unregisterProvider(channel: NotificationChannel, providerName: string): boolean {
        const providers = this.providers.get(channel);
        if (!providers) {
            return false;
        }

        const index = providers.findIndex(p => p.name === providerName);
        if (index >= 0) {
            providers.splice(index, 1);
            this.logger.debug(`Unregistered provider: ${providerName} from channel: ${channel}`);

            // Supprimer le canal s'il n'y a plus de providers
            if (providers.length === 0) {
                this.providers.delete(channel);
            }

            return true;
        }

        return false;
    }

    /**
     * Mettre à jour la configuration des événements
     */
    updateEventConfig(newConfig: EventTypesConfig<EventPayloads>): void {
        Object.assign(this.eventConfig, newConfig);
        this.logger.debug('Event configuration updated');
    }
}

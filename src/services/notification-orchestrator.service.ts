import {Injectable, Inject, Logger, Optional, forwardRef} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
    EventTypesConfig,
    NotificationResult,
    NotificationContext,
    NotificationProvider, EventTypeConfig
} from '../types/interfaces';
import {Recipient, RecipientDistribution, RecipientLoader, RecipientType} from '../loaders/recipient-loader.interface';
import {getNotifierMetadata, NotifierRegistry} from '../decorators/injectable-notifier.decorator';
import { EVENT_TYPES_CONFIG } from '../module/event-notifications.module';
import {BaseNotificationProvider} from "../providers/base-notification-provider";

/**
 * Service d'orchestration des notifications
 *
 * Ce service fait le lien entre :
 * - L'émission d'événements (EventEmitterService)
 * - La configuration des canaux (eventTypesConfig)
 * - La découverte automatique des providers (@InjectableNotifier)
 * - L'injection de dépendances NestJS (ModuleRef)
 */
@Injectable()
export class NotificationOrchestratorService {
    protected readonly logger = new Logger(NotificationOrchestratorService.name);

    constructor(
        @Inject(forwardRef(() => EVENT_TYPES_CONFIG)) private readonly eventTypesConfig: EventTypesConfig,
        private readonly moduleRef: ModuleRef,
        @Optional() private readonly recipientLoader?: RecipientLoader
    ) {}

    /**
     * Traite un événement et déclenche les notifications sur tous les canaux configurés
     */
    async processEvent(
        eventType: string,
        payload: any,
        context: NotificationContext
    ): Promise<NotificationResult[]> {
        const startTime = Date.now();

        try {
            // 1. Récupère la configuration de l'événement
            const eventConfig:EventTypeConfig = (this.eventTypesConfig as any)[eventType];
            if (!eventConfig) {
                this.logger.warn(`Aucune configuration trouvée pour l'événement: ${eventType}`);
                return [];
            }

            // 2. Charge les destinataires pour cet événement
            if (!this.recipientLoader) {
                this.logger.warn(`Aucun RecipientLoader configuré pour l'événement: ${eventType}`);
                return [];
            }

            const distributions = await this.recipientLoader.load(eventType, payload);
            if (!distributions || distributions.length === 0) {
                this.logger.warn(`Aucun destinataire trouvé pour l'événement: ${eventType}`);
                return [];
            }

            this.logger.log(
                `Traitement de l'événement ${eventType} pour ${distributions.length} destinataire(s) ` +
                `sur les canaux: [${eventConfig.channels.join(', ')}]`
            );

            // 3. Traite chaque canal configuré
            const allResults: NotificationResult[] = [];

            for (const channel of eventConfig.channels) {
                try {
                    const channelResults = await this.processChannel(
                        channel,
                        eventType,
                        payload,
                        {...context, metadata:{...context.metadata||{}, config: eventConfig}},
                        distributions
                    );
                    allResults.push(...channelResults);
                } catch (error) {
                    this.logger.error(
                        `Erreur lors du traitement du canal ${channel} pour l'événement ${eventType}: ${error.message}`
                    );

                    // Créer un résultat d'erreur pour ce canal
                    allResults.push({
                        channel,
                        provider: 'unknown',
                        status: 'failed',
                        error: error.message,
                        sentAt: new Date(),
                        attempts: context.attempt
                    });
                }
            }

            const duration = Date.now() - startTime;
            this.logger.log(
                `Événement ${eventType} traité en ${duration}ms. ` +
                `Résultats: ${allResults.filter(r => r.status === 'sent').length} envoyés, ` +
                `${allResults.filter(r => r.status === 'failed').length} échoués`
            );

            return allResults;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(
                `Erreur lors du traitement de l'événement ${eventType} (${duration}ms): ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Traite un canal spécifique en récupérant son provider et en envoyant les notifications
     */
    private async processChannel(
        channel: string,
        eventType: string,
        payload: any,
        context: NotificationContext,
        distributions: RecipientDistribution[]
    ): Promise<NotificationResult[]> {
        // 1. Découvre la classe du provider pour ce canal
        const ProviderClass = NotifierRegistry.getProviderByChannel(channel);
        if (!ProviderClass) {
            throw new Error(
                `Aucun provider trouvé pour le canal '${channel}'. ` +
                `Assurez-vous qu'un provider avec @InjectableNotifier({ channel: '${channel}' }) existe.`
            );
        }

        // 2. Récupère l'instance du provider depuis le container NestJS
        let providerInstance: NotificationProvider;
        try {
            providerInstance = this.moduleRef.get(ProviderClass, { strict: false });
        } catch (error) {
            throw new Error(
                `Impossible de récupérer l'instance du provider ${ProviderClass.name} ` +
                `pour le canal '${channel}'. Assurez-vous qu'il est bien configuré dans le module.`
            );
        }

        // 3. Vérifie que le provider est actif
        const isHealthy = await providerInstance.healthCheck();
        if (!isHealthy) {
            this.logger.warn(
                `Provider ${ProviderClass.name} pour le canal '${channel}' n'est pas en bonne santé`
            );
        }

        // 4. Envoie les notifications à tous les destinataires
        const results: NotificationResult[] = [];

        for (const distribution of distributions) {
            try {
                const providerResults = await providerInstance.send(distribution, payload, {
                    ...context,
                    eventType,
                    metadata: {
                        ...context.metadata,
                        channel
                    }
                });

                results.push(...providerResults);

                // Logger pour chaque résultat
                providerResults.forEach(result => {
                    if (result.status === 'sent') {
                        this.logger.debug(
                            `✅ Notification envoyée via ${ProviderClass.name} (${channel}) ` +
                            `à ${result.metadata?.recipientId || 'destinataire'}`
                        );
                    } else {
                        this.logger.warn(
                            `⚠️ Échec d'envoi via ${ProviderClass.name} (${channel}) ` +
                            `à ${result.metadata?.recipientId || 'destinataire'}: ${result.error}`
                        );
                    }
                });

            } catch (error) {
                this.logger.error(
                    `Erreur lors de l'envoi via ${ProviderClass.name} (${channel}) ` +
                    `à ${distribution.name || 'destinataire'}: ${error.message}`
                );


                results.push({
                    channel,
                    provider: ProviderClass.name,
                    status: 'failed',
                    error: error.message,
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: {distribution, channel }
                });
            }
        }

        return results;
    }

    /**
     * Vérifie la santé de tous les providers découverts
     */
    async healthCheckAllProviders(): Promise<Record<string, boolean>> {
        const health: Record<string, boolean> = {};
        const channels = NotifierRegistry.getChannels();

        for (const channel of channels) {
            try {
                const ProviderClass = NotifierRegistry.getProviderByChannel(channel);
                if (ProviderClass) {
                    const instance = this.moduleRef.get(ProviderClass, { strict: false });
                    health[channel] = await instance.healthCheck();
                }
            } catch (error) {
                health[channel] = false;
                this.logger.error(`Health check failed for channel ${channel}: ${error.message}`);
            }
        }

        return health;
    }

    /**
     * Retourne la liste des canaux disponibles et leurs providers
     */
    getAvailableChannels(): Array<{ channel: string, provider: string, description?: string }> {
        const channels = NotifierRegistry.getChannels();

        return channels.map(channel => {
            const ProviderClass = NotifierRegistry.getProviderByChannel(channel);
            const metadata = NotifierRegistry.getMetadata(ProviderClass?.name);

            return {
                channel,
                provider: ProviderClass?.name || 'Unknown',
                description: metadata?.description
            };
        });
    }
}

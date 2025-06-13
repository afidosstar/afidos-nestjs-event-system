// src/types/interfaces.ts
// ================================
// TYPES DE BASE ET INTERFACES PUBLIQUES
// ================================

/**
 * Interface de base que l'utilisateur étend pour définir ses types d'événements
 */
export interface EventPayloads {
    // L'utilisateur définit ses propres types d'événements
    // Exemple d'usage dans l'app consommatrice:
    // 'user.create': { userId: number; email: string; };
    // 'order.completed': { orderId: string; amount: number; };
}

/**
 * Canaux de notification supportés
 */
export type NotificationChannel = 'email' | 'sms' | 'webhook' | 'push' | 'external-service';

/**
 * Modes de traitement des événements
 */
export type ProcessingMode = 'sync' | 'async';

/**
 * Priorités des événements
 */
export type EventPriority = 'low' | 'normal' | 'high';

/**
 * Configuration d'un type d'événement
 */
export interface EventTypeConfig {
    /** Description du type d'événement */
    description: string;

    /** Canaux de notification à utiliser */
    channels: NotificationChannel[];

    /** Mode de traitement par défaut */
    defaultProcessing?: ProcessingMode;

    /** Attendre le résultat par défaut */
    waitForResult?: boolean;

    /** Nombre de tentatives en cas d'échec */
    retryAttempts?: number;

    /** Priorité de l'événement */
    priority?: EventPriority;

    /** Délai avant traitement (en ms) */
    delay?: number;

    /** Timeout pour l'attente de résultat (en ms) */
    timeout?: number;
}

/**
 * Configuration complète des types d'événements
 */
export interface EventTypesConfig<T extends EventPayloads = EventPayloads> {
    [K in keyof T]: EventTypeConfig;
}

/**
 * Configuration d'un provider de notification
 */
export interface NotificationProviderConfig {
    /** Driver du provider (smtp, twilio, http, etc.) */
    driver: string;

    /** Configuration spécifique au driver */
    config: Record<string, any>;

    /** Provider activé ou non */
    enabled?: boolean;

    /** Timeout pour ce provider (en ms) */
    timeout?: number;
}

/**
 * Configuration de la queue Redis
 */
export interface QueueConfig {
    /** Configuration Redis */
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };

    /** Nombre de workers concurrents */
    concurrency?: number;

    /** Préfixe pour les clés Redis */
    prefix?: string;

    /** Configuration des tentatives */
    defaultJobOptions?: {
        attempts?: number;
        delay?: number;
        removeOnComplete?: number;
        removeOnFail?: number;
    };
}

/**
 * Configuration principale du package
 */
export interface PackageConfig<T extends EventPayloads = EventPayloads> {
    /** Configuration des types d'événements */
    eventTypes: EventTypesConfig<T>;

    /** Configuration des providers */
    providers: Record<string, NotificationProviderConfig>;

    /** Configuration de la queue (optionnel) */
    queue?: QueueConfig;

    /** Mode de fonctionnement */
    mode?: 'api' | 'worker' | 'hybrid';

    /** Préfixe pour les tables de base de données */
    tablePrefix?: string;

    /** Options globales */
    global?: {
        /** Timeout global par défaut (en ms) */
        defaultTimeout?: number;

        /** Nombre de tentatives par défaut */
        defaultRetryAttempts?: number;

        /** Activer les logs détaillés */
        enableDetailedLogs?: boolean;
    };
}

/**
 * Options pour l'émission d'événements
 */
export interface EmitOptions {
    /** Attendre le résultat du traitement */
    waitForResult?: boolean;

    /** Mode de traitement forcé */
    mode?: ProcessingMode | 'auto';

    /** ID de corrélation personnalisé */
    correlationId?: string;

    /** Timeout personnalisé (en ms) */
    timeout?: number;

    /** Priorité personnalisée */
    priority?: EventPriority;

    /** Délai avant traitement (en ms) */
    delay?: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
}

/**
 * Résultat d'une notification
 */
export interface NotificationResult {
    /** Canal utilisé */
    channel: NotificationChannel;

    /** Provider utilisé */
    provider: string;

    /** Statut de l'envoi */
    status: 'sent' | 'failed' | 'pending' | 'retrying';

    /** Message d'erreur si échec */
    error?: string;

    /** Date d'envoi */
    sentAt?: Date;

    /** Métadonnées du provider */
    metadata?: Record<string, any>;

    /** Nombre de tentatives */
    attempts?: number;

    /** Prochaine tentative prévue */
    nextRetryAt?: Date;
}

/**
 * Résultat de l'émission d'un événement
 */
export interface EventEmissionResult {
    /** ID unique de l'événement */
    eventId: string;

    /** ID de corrélation */
    correlationId: string;

    /** Mode de traitement utilisé */
    mode: ProcessingMode;

    /** Si on a attendu le résultat */
    waitedForResult: boolean;

    /** Résultats des notifications (si disponibles) */
    results?: NotificationResult[];

    /** Date de mise en queue */
    queuedAt?: Date;

    /** Date de traitement */
    processedAt?: Date;

    /** Durée totale de traitement (en ms) */
    processingDuration?: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
}

/**
 * Interface pour les providers de notification
 */
export interface NotificationProvider {
    /** Nom du provider */
    readonly name: string;

    /** Canal supporté */
    readonly channel: NotificationChannel;

    /** Envoyer une notification */
    send(payload: any, context: NotificationContext): Promise<NotificationResult>;

    /** Vérifier la santé du provider */
    healthCheck(): Promise<boolean>;

    /** Valider la configuration */
    validateConfig(config: any): boolean | string[];
}

/**
 * Contexte d'une notification
 */
export interface NotificationContext {
    /** ID de corrélation */
    correlationId: string;

    /** Type d'événement */
    eventType: string;

    /** Tentative actuelle */
    attempt: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
}

/**
 * Événement interne pour la queue
 */
export interface QueuedEvent {
    /** ID unique de l'événement */
    eventId: string;

    /** Type d'événement */
    eventType: string;

    /** Payload de l'événement */
    payload: any;

    /** ID de corrélation */
    correlationId: string;

    /** Options d'émission */
    options?: EmitOptions;

    /** Tentative actuelle */
    attempt?: number;

    /** Date de création */
    createdAt: Date;
}

/**
 * Configuration pour la politique de retry
 */
export interface RetryPolicy {
    /** Nombre maximum de tentatives */
    maxAttempts: number;

    /** Délai initial (en ms) */
    initialDelay: number;

    /** Facteur de multiplication pour le backoff */
    backoffFactor: number;

    /** Délai maximum (en ms) */
    maxDelay: number;

    /** Fonction personnalisée pour calculer le délai */
    customDelayFunction?: (attempt: number) => number;
}

/**
 * Statistiques d'un provider
 */
export interface ProviderStats {
    /** Nom du provider */
    providerName: string;

    /** Canal */
    channel: NotificationChannel;

    /** Nombre total d'envois */
    totalSent: number;

    /** Nombre d'échecs */
    totalFailed: number;

    /** Taux de succès */
    successRate: number;

    /** Latence moyenne (en ms) */
    averageLatency: number;

    /** Dernière vérification de santé */
    lastHealthCheck: Date;

    /** Statut de santé */
    isHealthy: boolean;
}

/**
 * Événement système pour le monitoring
 */
export interface SystemEvent {
    /** Type d'événement système */
    type: 'provider.health.changed' | 'queue.full' | 'retry.exhausted' | 'config.updated';

    /** Timestamp */
    timestamp: Date;

    /** Données de l'événement */
    data: Record<string, any>;

    /** Niveau de sévérité */
    severity: 'info' | 'warning' | 'error' | 'critical';
}

// src/services/event-emitter.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
    EventPayloads,
    EventTypesConfig,
    EmitOptions,
    EventEmissionResult,
    ProcessingMode,
    NotificationResult,
    QueuedEvent
} from '../types/interfaces';
import { EventRoutingService } from './event-routing.service';
import { QueueService } from './queue.service';

/**
 * Service principal pour l'émission d'événements avec type safety
 */
@Injectable()
export class EventEmitterService<T extends EventPayloads = EventPayloads> {
    private readonly logger = new Logger(EventEmitterService.name);

    constructor(
        private readonly eventConfig: EventTypesConfig<T>,
        private readonly routingService: EventRoutingService,
        private readonly queueService: QueueService
    ) {}

    /**
     * Émettre un événement avec type safety complète
     */
    async emit<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        const startTime = Date.now();
        const eventId = this.generateEventId();
        const correlationId = options.correlationId || this.generateCorrelationId();

        this.logger.debug(`Emitting event: ${String(eventType)}`, {
            eventId,
            correlationId,
            hasPayload: !!payload
        });

        try {
            // 1. Valider la configuration de l'événement
            this.validateEventType(eventType);

            // 2. Déterminer le mode de traitement
            const mode = this.determineProcessingMode(eventType, options);

            // 3. Créer le résultat de base
            const result: EventEmissionResult = {
                eventId,
                correlationId,
                mode,
                waitedForResult: false,
                metadata: {
                    eventType: String(eventType),
                    ...options.metadata
                }
            };

            // 4. Traiter selon le mode
            if (mode === 'sync') {
                await this.processSynchronously(result, eventType, payload, options);
            } else {
                await this.processAsynchronously(result, eventType, payload, options);
            }

            // 5. Calculer la durée totale
            result.processingDuration = Date.now() - startTime;

            this.logger.debug(`Event emission completed: ${String(eventType)}`, {
                eventId,
                correlationId,
                mode,
                duration: result.processingDuration
            });

            return result;

        } catch (error) {
            this.logger.error(`Failed to emit event: ${String(eventType)}`, {
                eventId,
                correlationId,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Émettre un événement en mode synchrone
     */
    async emitSync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: Omit<EmitOptions, 'mode'> = {}
    ): Promise<EventEmissionResult> {
        return this.emit(eventType, payload, { ...options, mode: 'sync' });
    }

    /**
     * Émettre un événement en mode asynchrone
     */
    async emitAsync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: Omit<EmitOptions, 'mode'> = {}
    ): Promise<EventEmissionResult> {
        return this.emit(eventType, payload, { ...options, mode: 'async' });
    }

    /**
     * Émettre un événement et attendre le résultat
     */
    async emitAndWait<K extends keyof T>(
        eventType: K,
        payload: T[K],
        timeout: number = 30000,
        options: Omit<EmitOptions, 'waitForResult' | 'timeout'> = {}
    ): Promise<EventEmissionResult> {
        return this.emit(eventType, payload, {
            ...options,
            waitForResult: true,
            timeout
        });
    }

    /**
     * Valider qu'un type d'événement est configuré
     */
    private validateEventType<K extends keyof T>(eventType: K): void {
        const config = this.eventConfig[eventType];
        if (!config) {
            throw new Error(`Event type '${String(eventType)}' is not configured`);
        }

        if (!config.channels || config.channels.length === 0) {
            throw new Error(`Event type '${String(eventType)}' has no channels configured`);
        }
    }

    /**
     * Déterminer le mode de traitement
     */
    private determineProcessingMode<K extends keyof T>(
        eventType: K,
        options: EmitOptions
    ): ProcessingMode {
        // 1. Mode explicitement spécifié
        if (options.mode && options.mode !== 'auto') {
            return options.mode;
        }

        // 2. Si on doit attendre le résultat, forcer sync
        if (options.waitForResult) {
            return 'sync';
        }

        // 3. Configuration du type d'événement
        const config = this.eventConfig[eventType];
        if (config.defaultProcessing) {
            return config.defaultProcessing;
        }

        // 4. Par défaut : async
        return 'async';
    }

    /**
     * Traiter un événement en mode synchrone
     */
    private async processSynchronously<K extends keyof T>(
        result: EventEmissionResult,
        eventType: K,
        payload: T[K],
        options: EmitOptions
    ): Promise<void> {
        this.logger.debug(`Processing event synchronously: ${String(eventType)}`, {
            eventId: result.eventId
        });

        try {
            const results = await this.routingService.processEvent(
                String(eventType),
                payload,
                {
                    correlationId: result.correlationId,
                    eventType: String(eventType),
                    attempt: 1,
                    metadata: options.metadata
                }
            );

            result.results = results;
            result.waitedForResult = true;
            result.processedAt = new Date();

        } catch (error) {
            this.logger.error(`Synchronous processing failed: ${String(eventType)}`, {
                eventId: result.eventId,
                error: error.message
            });

            // En cas d'erreur, créer un résultat d'échec
            result.results = [{
                channel: 'unknown' as any,
                provider: 'unknown',
                status: 'failed',
                error: error.message,
                sentAt: new Date()
            }];
            result.processedAt = new Date();
        }
    }

    /**
     * Traiter un événement en mode asynchrone
     */
    private async processAsynchronously<K extends keyof T>(
        result: EventEmissionResult,
        eventType: K,
        payload: T[K],
        options: EmitOptions
    ): Promise<void> {
        this.logger.debug(`Processing event asynchronously: ${String(eventType)}`, {
            eventId: result.eventId
        });

        const queuedEvent: QueuedEvent = {
            eventId: result.eventId,
            eventType: String(eventType),
            payload,
            correlationId: result.correlationId,
            options,
            attempt: 1,
            createdAt: new Date()
        };

        // Ajouter à la queue
        await this.queueService.addJob(queuedEvent, {
            priority: this.getPriorityValue(options.priority),
            delay: options.delay || this.eventConfig[eventType].delay || 0
        });

        result.queuedAt = new Date();

        // Si on doit attendre le résultat
        if (options.waitForResult) {
            this.logger.debug(`Waiting for results: ${String(eventType)}`, {
                eventId: result.eventId,
                timeout: options.timeout
            });

            try {
                const timeout = options.timeout ||
                    this.eventConfig[eventType].timeout ||
                    30000;

                result.results = await this.waitForResults(result.eventId, timeout);
                result.waitedForResult = true;
                result.processedAt = new Date();

            } catch (error) {
                this.logger.warn(`Timeout waiting for results: ${String(eventType)}`, {
                    eventId: result.eventId,
                    error: error.message
                });

                result.results = [{
                    channel: 'unknown' as any,
                    provider: 'unknown',
                    status: 'pending',
                    error: 'Timeout waiting for results',
                    sentAt: new Date()
                }];
                result.waitedForResult = true;
                result.processedAt = new Date();
            }
        }
    }

    /**
     * Attendre les résultats d'un événement traité en asynchrone
     */
    private async waitForResults(
        eventId: string,
        timeout: number
    ): Promise<NotificationResult[]> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout waiting for results of event ${eventId}`));
            }, timeout);

            // Polling des résultats
            const pollInterval = setInterval(async () => {
                try {
                    const results = await this.queueService.getEventResults(eventId);
                    if (results && results.length > 0) {
                        clearTimeout(timeoutId);
                        clearInterval(pollInterval);
                        resolve(results);
                    }
                } catch (error) {
                    this.logger.warn(`Error polling results for event ${eventId}`, {
                        error: error.message
                    });
                }
            }, 500); // Poll toutes les 500ms
        });
    }

    /**
     * Convertir la priorité en valeur numérique pour Bull
     */
    private getPriorityValue(priority?: string): number {
        switch (priority) {
            case 'high': return 10;
            case 'normal': return 5;
            case 'low': return 1;
            default: return 5;
        }
    }

    /**
     * Générer un ID unique pour l'événement
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${uuidv4().substring(0, 8)}`;
    }

    /**
     * Générer un ID de corrélation unique
     */
    private generateCorrelationId(): string {
        return `corr_${Date.now()}_${uuidv4().substring(0, 8)}`;
    }

    /**
     * Obtenir les statistiques du service
     */
    async getStats(): Promise<{
        totalEvents: number;
        syncEvents: number;
        asyncEvents: number;
        averageProcessingTime: number;
    }> {
        // Implementation pour récupérer les stats depuis la queue/cache
        return {
            totalEvents: 0,
            syncEvents: 0,
            asyncEvents: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Vérifier la santé du service
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        checks: Record<string, boolean>;
    }> {
        const checks: Record<string, boolean> = {};

        try {
            // Vérifier la queue
            checks.queue = await this.queueService.healthCheck();
        } catch {
            checks.queue = false;
        }

        try {
            // Vérifier le service de routing
            checks.routing = await this.routingService.healthCheck();
        } catch {
            checks.routing = false;
        }

        const healthyChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;

        let status: 'healthy' | 'degraded' | 'unhealthy';
        if (healthyChecks === totalChecks) {
            status = 'healthy';
        } else if (healthyChecks > 0) {
            status = 'degraded';
        } else {
            status = 'unhealthy';
        }

        return { status, checks };
    }
}

// src/services/event-routing.service.ts
import { Injectable, Logger } from '@nestjs/common';
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

/**
 * Service de routage et coordination des notifications multi-canal
 */
@Injectable()
export class EventRoutingService {
    private readonly logger = new Logger(EventRoutingService.name);
    private readonly providers = new Map<NotificationChannel, NotificationProvider[]>();

    constructor(
        private readonly eventConfig: EventTypesConfig<EventPayloads>,
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
        return this.eventConfig[eventType] || null;
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

// src/services/queue.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Job, Worker } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import {
    QueuedEvent,
    NotificationResult,
    QueueConfig,
    NotificationContext
} from '../types/interfaces';
import { EventRoutingService } from './event-routing.service';

/**
 * Service de gestion des queues avec Bull/Redis
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
    private readonly logger = new Logger(QueueService.name);
    private readonly resultCache = new Map<string, NotificationResult[]>();
    private readonly resultTTL = 300000; // 5 minutes

    constructor(
        @InjectQueue('notifications') private readonly notificationQueue: Queue,
        private readonly routingService: EventRoutingService
    ) {
        this.initializeWorkers();
        this.setupCleanupInterval();
    }

    /**
     * Ajouter un job à la queue
     */
    async addJob(
        event: QueuedEvent,
        options: {
            priority?: number;
            delay?: number;
            attempts?: number;
        } = {}
    ): Promise<void> {
        try {
            await this.notificationQueue.add(
                'process-notification',
                event,
                {
                    priority: options.priority || 5,
                    delay: options.delay || 0,
                    attempts: options.attempts || 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    jobId: event.eventId // Pour éviter les doublons
                }
            );

            this.logger.debug(`Job added to queue`, {
                eventId: event.eventId,
                eventType: event.eventType,
                correlationId: event.correlationId,
                priority: options.priority,
                delay: options.delay
            });

        } catch (error) {
            this.logger.error(`Failed to add job to queue`, {
                eventId: event.eventId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Récupérer les résultats d'un événement
     */
    async getEventResults(eventId: string): Promise<NotificationResult[] | null> {
        return this.resultCache.get(eventId) || null;
    }

    /**
     * Stocker les résultats d'un événement
     */
    async storeEventResults(eventId: string, results: NotificationResult[]): Promise<void> {
        this.resultCache.set(eventId, results);

        // Programmer la suppression après TTL
        setTimeout(() => {
            this.resultCache.delete(eventId);
        }, this.resultTTL);

        this.logger.debug(`Results stored for event`, {
            eventId,
            resultCount: results.length
        });
    }

    /**
     * Initialiser les workers pour traiter les jobs
     */
    private initializeWorkers(): void {
        this.notificationQueue.process('process-notification', 5, async (job: Job<QueuedEvent>) => {
            return this.processNotificationJob(job);
        });

        // Event listeners pour monitoring
        this.notificationQueue.on('completed', (job) => {
            this.logger.debug(`Job completed`, {
                jobId: job.id,
                eventId: job.data.eventId,
                duration: Date.now() - job.timestamp
            });
        });

        this.notificationQueue.on('failed', (job, error) => {
            this.logger.error(`Job failed`, {
                jobId: job.id,
                eventId: job.data.eventId,
                error: error.message,
                attempts: job.attemptsMade
            });
        });

        this.notificationQueue.on('stalled', (job) => {
            this.logger.warn(`Job stalled`, {
                jobId: job.id,
                eventId: job.data.eventId
            });
        });

        this.logger.log('Queue workers initialized');
    }

    /**
     * Traiter un job de notification
     */
    private async processNotificationJob(job: Job<QueuedEvent>): Promise<NotificationResult[]> {
        const { eventId, eventType, payload, correlationId, options } = job.data;
        const attempt = job.attemptsMade + 1;

        this.logger.debug(`Processing notification job`, {
            jobId: job.id,
            eventId,
            eventType,
            correlationId,
            attempt
        });

        try {
            const context: NotificationContext = {
                correlationId,
                eventType,
                attempt,
                metadata: {
                    jobId: job.id,
                    queuedAt: new Date(job.timestamp),
                    ...options?.metadata
                }
            };

            // Traiter l'événement via le service de routage
            const results = await this.routingService.processEvent(eventType, payload, context);

            // Stocker les résultats pour récupération ultérieure
            await this.storeEventResults(eventId, results);

            return results;

        } catch (error) {
            this.logger.error(`Notification job processing failed`, {
                jobId: job.id,
                eventId,
                eventType,
                error: error.message,
                attempt
            });

            // Si c'est le dernier essai, stocker un résultat d'échec
            if (attempt >= (job.opts.attempts || 3)) {
                const failureResult: NotificationResult[] = [{
                    channel: 'unknown' as any,
                    provider: 'unknown',
                    status: 'failed',
                    error: error.message,
                    sentAt: new Date(),
                    attempts: attempt
                }];

                await this.storeEventResults(eventId, failureResult);
            }

            throw error;
        }
    }

    /**
     * Obtenir les statistiques de la queue
     */
    async getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: boolean;
    }> {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.notificationQueue.getWaiting(),
            this.notificationQueue.getActive(),
            this.notificationQueue.getCompleted(),
            this.notificationQueue.getFailed(),
            this.notificationQueue.getDelayed()
        ]);

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            paused: await this.notificationQueue.isPaused()
        };
    }

    /**
     * Obtenir les jobs en attente
     */
    async getWaitingJobs(limit: number = 10): Promise<Array<{
        id: string;
        eventId: string;
        eventType: string;
        createdAt: Date;
        priority: number;
    }>> {
        const jobs = await this.notificationQueue.getWaiting(0, limit - 1);

        return jobs.map(job => ({
            id: job.id!.toString(),
            eventId: job.data.eventId,
            eventType: job.data.eventType,
            createdAt: new Date(job.timestamp),
            priority: job.opts.priority || 0
        }));
    }

    /**
     * Obtenir les jobs actifs
     */
    async getActiveJobs(): Promise<Array<{
        id: string;
        eventId: string;
        eventType: string;
        startedAt: Date;
        progress: number;
    }>> {
        const jobs = await this.notificationQueue.getActive();

        return jobs.map(job => ({
            id: job.id!.toString(),
            eventId: job.data.eventId,
            eventType: job.data.eventType,
            startedAt: new Date(job.processedOn || job.timestamp),
            progress: job.progress()
        }));
    }

    /**
     * Retry d'un job échoué
     */
    async retryJob(jobId: string): Promise<boolean> {
        try {
            const job = await this.notificationQueue.getJob(jobId);
            if (job && job.isFailed()) {
                await job.retry();
                this.logger.debug(`Job retried`, { jobId });
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to retry job`, {
                jobId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Supprimer un job
     */
    async removeJob(jobId: string): Promise<boolean> {
        try {
            const job = await this.notificationQueue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.debug(`Job removed`, { jobId });
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to remove job`, {
                jobId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Nettoyer les anciens jobs
     */
    async cleanJobs(): Promise<void> {
        try {
            // Nettoyer les jobs complétés de plus de 24h
            await this.notificationQueue.clean(24 * 60 * 60 * 1000, 'completed');

            // Nettoyer les jobs échoués de plus de 7 jours
            await this.notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');

            this.logger.debug('Queue cleanup completed');
        } catch (error) {
            this.logger.error('Queue cleanup failed', {
                error: error.message
            });
        }
    }

    /**
     * Pauser la queue
     */
    async pauseQueue(): Promise<void> {
        await this.notificationQueue.pause();
        this.logger.log('Queue paused');
    }

    /**
     * Reprendre la queue
     */
    async resumeQueue(): Promise<void> {
        await this.notificationQueue.resume();
        this.logger.log('Queue resumed');
    }

    /**
     * Vérifier la santé de la queue
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Vérifier que la queue est accessible
            await this.notificationQueue.getWaiting(0, 0);
            return true;
        } catch (error) {
            this.logger.error('Queue health check failed', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Configurer l'intervalle de nettoyage automatique
     */
    private setupCleanupInterval(): void {
        // Nettoyer toutes les heures
        setInterval(() => {
            this.cleanJobs();
        }, 60 * 60 * 1000);

        // Nettoyer le cache des résultats toutes les 10 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [eventId, _] of this.resultCache.entries()) {
                // Simple TTL check - dans un vrai cas, on stockerait le timestamp
                if (this.resultCache.size > 1000) { // Limite arbitraire
                    this.resultCache.delete(eventId);
                }
            }
        }, 10 * 60 * 1000);
    }

    /**
     * Nettoyage lors de la destruction du module
     */
    async onModuleDestroy(): Promise<void> {
        try {
            await this.notificationQueue.close();
            this.logger.log('Queue service destroyed');
        } catch (error) {
            this.logger.error('Error destroying queue service', {
                error: error.message
            });
        }
    }
}

// src/services/retry.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { NotificationResult, RetryPolicy } from '../types/interfaces';

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

// src/providers/base/notification-provider.interface.ts
import { NotificationProvider as INotificationProvider } from '../../types/interfaces';

export { INotificationProvider as NotificationProvider };

// src/providers/email/smtp-email.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { createTransporter, Transporter } from 'nodemailer';
import {
    NotificationProvider,
    NotificationResult,
    NotificationContext,
    NotificationChannel
} from '../../types/interfaces';

export interface SmtpConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    timeout?: number;
}

export interface EmailPayload {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

/**
 * Provider SMTP pour l'envoi d'emails
 */
@Injectable()
export class SmtpEmailProvider implements NotificationProvider {
    readonly name = 'smtp';
    readonly channel: NotificationChannel = 'email';

    private readonly logger = new Logger(SmtpEmailProvider.name);
    private transporter: Transporter;
    private isConfigured = false;

    constructor(private config: SmtpConfig) {
        this.initializeTransporter();
    }

    /**
     * Initialiser le transporteur SMTP
     */
    private initializeTransporter(): void {
        try {
            this.transporter = createTransporter({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure || this.config.port === 465,
                auth: this.config.auth,
                connectionTimeout: this.config.timeout || 10000,
                greetingTimeout: this.config.timeout || 10000,
                socketTimeout: this.config.timeout || 10000
            });

            this.isConfigured = true;
            this.logger.log(`SMTP provider initialized: ${this.config.host}:${this.config.port}`);

        } catch (error) {
            this.logger.error('Failed to initialize SMTP transporter', {
                error: error.message,
                host: this.config.host,
                port: this.config.port
            });
            this.isConfigured = false;
        }
    }

    /**
     * Envoyer un email
     */
    async send(payload: EmailPayload, context: NotificationContext): Promise<NotificationResult> {
        if (!this.isConfigured) {
            return {
                channel: this.channel,
                provider: this.name,
                status: 'failed',
                error: 'SMTP provider not properly configured',
                sentAt: new Date(),
                attempts: context.attempt
            };
        }

        const startTime = Date.now();

        try {
            // Valider le payload
            this.validateEmailPayload(payload);

            // Préparer l'email
            const mailOptions = {
                from: this.config.from,
                to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
                cc: payload.cc ? (Array.isArray(payload.cc) ? payload.cc.join(', ') : payload.cc) : undefined,
                bcc: payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc.join(', ') : payload.bcc) : undefined,
                attachments: payload.attachments,
                headers: {
                    'X-Correlation-ID': context.correlationId,
                    'X-Event-Type': context.eventType,
                    'X-Attempt': context.attempt.toString()
                }
            };

            this.logger.debug('Sending email', {
                correlationId: context.correlationId,
                to: mailOptions.to,
                subject: payload.subject,
                attempt: context.attempt
            });

            // Envoyer l'email
            const info = await this.transporter.sendMail(mailOptions);
            const duration = Date.now() - startTime;

            this.logger.debug('Email sent successfully', {
                correlationId: context.correlationId,
                messageId: info.messageId,
                duration
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'sent',
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    messageId: info.messageId,
                    duration,
                    response: info.response,
                    recipients: mailOptions.to
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('Failed to send email', {
                correlationId: context.correlationId,
                error: error.message,
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
                metadata: { duration }
            };
        }
    }

    /**
     * Vérifier la santé du provider
     */
    async healthCheck(): Promise<boolean> {
        if (!this.isConfigured) {
            return false;
        }

        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            this.logger.warn('SMTP health check failed', {
                error: error.message,
                host: this.config.host
            });
            return false;
        }
    }

    /**
     * Valider la configuration
     */
    validateConfig(config: SmtpConfig): boolean | string[] {
        const errors: string[] = [];

        if (!config.host) errors.push('host is required');
        if (!config.port) errors.push('port is required');
        if (!config.auth?.user) errors.push('auth.user is required');
        if (!config.auth?.pass) errors.push('auth.pass is required');
        if (!config.from) errors.push('from address is required');

        if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('port must be between 1 and 65535');
        }

        return errors.length === 0 ? true : errors;
    }

    /**
     * Valider le payload d'email
     */
    private validateEmailPayload(payload: EmailPayload): void {
        if (!payload.to) {
            throw new Error('Recipient (to) is required');
        }

        if (!payload.subject) {
            throw new Error('Subject is required');
        }

        if (!payload.text && !payload.html) {
            throw new Error('Either text or html content is required');
        }

        // Valider les adresses email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

        for (const recipient of recipients) {
            if (!emailRegex.test(recipient)) {
                throw new Error(`Invalid email address: ${recipient}`);
            }
        }
    }
}

// src/providers/webhook/http-webhook.provider.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

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

// src/providers/external-service/firebase-like.provider.ts
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

// src/module/event-notifications.module.ts
import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import {
    EventPayloads,
    PackageConfig,
    NotificationProviderConfig,
    QueueConfig
} from '../types/interfaces';

// Services
import { EventEmitterService } from '../services/event-emitter.service';
import { EventRoutingService } from '../services/event-routing.service';
import { QueueService } from '../services/queue.service';
import { RetryService } from '../services/retry.service';

// Providers
import { SmtpEmailProvider, SmtpConfig } from '../providers/email/smtp-email.provider';
import { HttpWebhookProvider, WebhookConfig } from '../providers/webhook/http-webhook.provider';
import { ExternalServiceProvider, ExternalServiceConfig } from '../providers/external-service/firebase-like.provider';

// Entities (à créer)
import { EventTypeEntity } from '../entities/event-type.entity';
import { EventLogEntity } from '../entities/event-log.entity';

/**
 * Configuration tokens pour l'injection de dépendances
 */
export const EVENT_NOTIFICATIONS_CONFIG = 'EVENT_NOTIFICATIONS_CONFIG';
export const EVENT_TYPES_CONFIG = 'EVENT_TYPES_CONFIG';
export const PROVIDERS_CONFIG = 'PROVIDERS_CONFIG';

/**
 * Module principal pour le système d'événements et notifications
 */
@Global()
@Module({})
export class EventNotificationsModule {
    /**
     * Configuration synchrone du module
     */
    static forRoot<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: [
                // TypeORM pour les entités
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ]),

                // Bull pour les queues (optionnel)
                ...(config.queue ? [
                    BullModule.forRoot({
                        redis: config.queue.redis,
                        prefix: config.queue.prefix || 'notifications'
                    }),
                    BullModule.registerQueue({
                        name: 'notifications',
                        defaultJobOptions: config.queue.defaultJobOptions || {
                            attempts: 3,
                            delay: 1000,
                            removeOnComplete: 100,
                            removeOnFail: 50
                        }
                    })
                ] : [])
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useValue: config.providers
                },

                // Core services
                RetryService,
                EventRoutingService,
                QueueService,
                EventEmitterService,

                // Dynamic providers based on configuration
                ...this.createNotificationProviders(config.providers)
            ],
            exports: [
                EventEmitterService,
                EventRoutingService,
                QueueService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ]
        };
    }

    /**
     * Configuration asynchrone du module
     */
    static forRootAsync<T extends EventPayloads = EventPayloads>(options: {
        imports?: any[];
        inject?: any[];
        useFactory: (...args: any[]) => Promise<PackageConfig<T>> | PackageConfig<T>;
    }): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: [
                ...(options.imports || []),
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ])
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useFactory: options.useFactory,
                    inject: options.inject || []
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return config.eventTypes;
                    },
                    inject: options.inject || []
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return config.providers;
                    },
                    inject: options.inject || []
                },

                // Core services
                RetryService,
                EventRoutingService,
                QueueService,
                EventEmitterService,

                // Dynamic providers factory
                {
                    provide: 'NOTIFICATION_PROVIDERS_FACTORY',
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return this.createNotificationProviders(config.providers);
                    },
                    inject: options.inject || []
                }
            ],
            exports: [
                EventEmitterService,
                EventRoutingService,
                QueueService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ]
        };
    }

    /**
     * Créer les providers de notification dynamiquement
     */
    private static createNotificationProviders(
        providersConfig: Record<string, NotificationProviderConfig>
    ): Provider[] {
        const providers: Provider[] = [];

        for (const [channelName, providerConfig] of Object.entries(providersConfig)) {
            if (!providerConfig.enabled && providerConfig.enabled !== undefined) {
                continue; // Skip disabled providers
            }

            const providerToken = `${channelName.toUpperCase()}_PROVIDER`;

            switch (providerConfig.driver) {
                case 'smtp':
                    providers.push({
                        provide: providerToken,
                        useFactory: (routingService: EventRoutingService) => {
                            const provider = new SmtpEmailProvider(providerConfig.config as SmtpConfig);

                            // Valider la configuration
                            const validation = provider.validateConfig(providerConfig.config as SmtpConfig);
                            if (validation !== true) {
                                throw new Error(`Invalid SMTP configuration for ${channelName}: ${validation.join(', ')}`);
                            }

                            // Enregistrer le provider
                            routingService.registerProvider(provider);
                            return provider;
                        },
                        inject: [EventRoutingService]
                    });
                    break;

                case 'http':
                case 'webhook':
                    providers.push({
                        provide: providerToken,
                        useFactory: (routingService: EventRoutingService) => {
                            const provider = new HttpWebhookProvider(providerConfig.config as WebhookConfig);

                            // Valider la configuration
                            const validation = provider.validateConfig(providerConfig.config as WebhookConfig);
                            if (validation !== true) {
                                throw new Error(`Invalid webhook configuration for ${channelName}: ${validation.join(', ')}`);
                            }

                            // Enregistrer le provider
                            routingService.registerProvider(provider);
                            return provider;
                        },
                        inject: [EventRoutingService]
                    });
                    break;

                case 'firebase-like':
                case 'external-service':
                    providers.push({
                        provide: providerToken,
                        useFactory: (routingService: EventRoutingService) => {
                            const provider = new ExternalServiceProvider(providerConfig.config as ExternalServiceConfig);

                            // Valider la configuration
                            const validation = provider.validateConfig(providerConfig.config as ExternalServiceConfig);
                            if (validation !== true) {
                                throw new Error(`Invalid external service configuration for ${channelName}: ${validation.join(', ')}`);
                            }

                            // Enregistrer le provider
                            routingService.registerProvider(provider);
                            return provider;
                        },
                        inject: [EventRoutingService]
                    });
                    break;

                default:
                    throw new Error(`Unsupported provider driver: ${providerConfig.driver} for channel: ${channelName}`);
            }
        }

        return providers;
    }

    /**
     * Créer un module worker uniquement (pour les instances worker dédiées)
     */
    static forWorker<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        if (!config.queue) {
            throw new Error('Queue configuration is required for worker mode');
        }

        return {
            module: EventNotificationsModule,
            imports: [
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ]),
                BullModule.forRoot({
                    redis: config.queue.redis,
                    prefix: config.queue.prefix || 'notifications'
                }),
                BullModule.registerQueue({
                    name: 'notifications',
                    defaultJobOptions: config.queue.defaultJobOptions || {
                        attempts: 3,
                        delay: 1000,
                        removeOnComplete: 100,
                        removeOnFail: 50
                    }
                })
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useValue: config.providers
                },

                // Services nécessaires pour le worker
                RetryService,
                EventRoutingService,
                QueueService,

                // Providers de notification
                ...this.createNotificationProviders(config.providers)
            ],
            exports: [
                QueueService,
                EventRoutingService
            ]
        };
    }

    /**
     * Créer un module API uniquement (sans workers)
     */
    static forApi<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: [
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ]),

                // Queue pour l'émission uniquement (pas de workers)
                ...(config.queue ? [
                    BullModule.forRoot({
                        redis: config.queue.redis,
                        prefix: config.queue.prefix || 'notifications'
                    }),
                    BullModule.registerQueue({
                        name: 'notifications'
                    })
                ] : [])
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes
                },

                // Services pour l'API (pas de routing complet)
                RetryService,
                EventEmitterService,
                ...(config.queue ? [QueueService] : [])
            ],
            exports: [
                EventEmitterService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ]
        };
    }
}

// src/entities/event-type.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';
import { NotificationChannel, ProcessingMode, EventPriority } from '../types/interfaces';

/**
 * Entité pour stocker la configuration des types d'événements
 */
@Entity('event_types')
@Index(['name'], { unique: true })
export class EventTypeEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'json' })
    channels: NotificationChannel[];

    @Column({
        type: 'enum',
        enum: ['sync', 'async'],
        default: 'async'
    })
    defaultProcessing: ProcessingMode;

    @Column({ type: 'boolean', default: false })
    waitForResult: boolean;

    @Column({ type: 'integer', default: 3 })
    retryAttempts: number;

    @Column({
        type: 'enum',
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    })
    priority: EventPriority;

    @Column({ type: 'integer', nullable: true })
    delay: number;

    @Column({ type: 'integer', default: 30000 })
    timeout: number;

    @Column({ type: 'json', nullable: true })
    schema: Record<string, any>;

    @Column({ type: 'json', nullable: true })
    templates: Record<string, string>;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    createdBy: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    updatedBy: string;
}

// src/entities/event-log.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn
} from 'typeorm';

/**
 * Entité pour logger les événements émis
 */
@Entity('event_logs')
@Index(['eventType'])
@Index(['correlationId'])
@Index(['status'])
@Index(['createdAt'])
export class EventLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    eventId: string;

    @Column({ type: 'varchar', length: 255 })
    eventType: string;

    @Column({ type: 'varchar', length: 255 })
    correlationId: string;

    @Column({ type: 'json' })
    payload: any;

    @Column({
        type: 'enum',
        enum: ['sync', 'async']
    })
    mode: ProcessingMode;

    @Column({
        type: 'enum',
        enum: ['pending', 'processing', 'completed', 'failed', 'timeout'],
        default: 'pending'
    })
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

    @Column({ type: 'boolean', default: false })
    waitedForResult: boolean;

    @Column({ type: 'json', nullable: true })
    results: any[];

    @Column({ type: 'timestamp', nullable: true })
    queuedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column({ type: 'integer', nullable: true })
    processingDuration: number;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ type: 'json', nullable: true })
    errorDetails: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    // Relation optionnelle avec EventType
    @ManyToOne(() => EventTypeEntity, { nullable: true })
    @JoinColumn({ name: 'eventType', referencedColumnName: 'name' })
    eventTypeEntity: EventTypeEntity;
}

// src/entities/notification-result.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn
} from 'typeorm';

/**
 * Entité pour stocker les résultats détaillés des notifications
 */
@Entity('notification_results')
@Index(['eventLogId'])
@Index(['channel'])
@Index(['provider'])
@Index(['status'])
@Index(['sentAt'])
export class NotificationResultEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    eventLogId: string;

    @Column({ type: 'varchar', length: 255 })
    correlationId: string;

    @Column({
        type: 'enum',
        enum: ['email', 'sms', 'webhook', 'push', 'external-service']
    })
    channel: NotificationChannel;

    @Column({ type: 'varchar', length: 255 })
    provider: string;

    @Column({
        type: 'enum',
        enum: ['sent', 'failed', 'pending', 'retrying']
    })
    status: 'sent' | 'failed' | 'pending' | 'retrying';

    @Column({ type: 'text', nullable: true })
    error: string;

    @Column({ type: 'timestamp', nullable: true })
    sentAt: Date;

    @Column({ type: 'integer', default: 1 })
    attempts: number;

    @Column({ type: 'timestamp', nullable: true })
    nextRetryAt: Date;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    // Relation avec EventLog
    @ManyToOne(() => EventLogEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'eventLogId' })
    eventLog: EventLogEntity;
}

// src/entities/provider-health.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';

/**
 * Entité pour tracker la santé des providers
 */
@Entity('provider_health')
@Index(['channel', 'provider'], { unique: true })
@Index(['isHealthy'])
@Index(['lastCheckAt'])
export class ProviderHealthEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ['email', 'sms', 'webhook', 'push', 'external-service']
    })
    channel: NotificationChannel;

    @Column({ type: 'varchar', length: 255 })
    provider: string;

    @Column({ type: 'boolean', default: true })
    isHealthy: boolean;

    @Column({ type: 'timestamp' })
    lastCheckAt: Date;

    @Column({ type: 'text', nullable: true })
    lastError: string;

    @Column({ type: 'integer', default: 0 })
    consecutiveFailures: number;

    @Column({ type: 'integer', default: 0 })
    totalChecks: number;

    @Column({ type: 'integer', default: 0 })
    successfulChecks: number;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// src/entities/event-stats.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';

/**
 * Entité pour stocker les statistiques agrégées
 */
@Entity('event_stats')
@Index(['eventType', 'date'], { unique: true })
@Index(['date'])
export class EventStatsEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    eventType: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'integer', default: 0 })
    totalEvents: number;

    @Column({ type: 'integer', default: 0 })
    syncEvents: number;

    @Column({ type: 'integer', default: 0 })
    asyncEvents: number;

    @Column({ type: 'integer', default: 0 })
    successfulEvents: number;

    @Column({ type: 'integer', default: 0 })
    failedEvents: number;

    @Column({ type: 'float', default: 0 })
    averageProcessingTime: number;

    @Column({ type: 'float', default: 0 })
    minProcessingTime: number;

    @Column({ type: 'float', default: 0 })
    maxProcessingTime: number;

    @Column({ type: 'json', nullable: true })
    channelStats: Record<string, {
        total: number;
        successful: number;
        failed: number;
        averageLatency: number;
    }>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// src/entities/index.ts
export { EventTypeEntity } from './event-type.entity';
export { EventLogEntity } from './event-log.entity';
export { NotificationResultEntity } from './notification-result.entity';
export { ProviderHealthEntity } from './provider-health.entity';
export { EventStatsEntity } from './event-stats.entity';

// src/commands/sync-event-types.command.ts
import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventTypeEntity } from '../entities/event-type.entity';
import { EventTypesConfig, EventPayloads } from '../types/interfaces';
import * as path from 'path';
import * as fs from 'fs';

interface SyncCommandOptions {
    config?: string;
    dryRun?: boolean;
    force?: boolean;
    backup?: boolean;
    verbose?: boolean;
}

/**
 * Commande CLI pour synchroniser la configuration des événements avec la base de données
 */
@Command({
    name: 'sync-event-types',
    description: 'Synchronize event types configuration to database',
    examples: [
        'sync-event-types',
        'sync-event-types --config ./config/events.config.ts',
        'sync-event-types --dry-run',
        'sync-event-types --force --backup'
    ]
})
@Injectable()
export class SyncEventTypesCommand extends CommandRunner {
    private readonly logger = new Logger(SyncEventTypesCommand.name);

    constructor(private dataSource: DataSource) {
        super();
    }

    async run(passedParam: string[], options?: SyncCommandOptions): Promise<void> {
        try {
            this.logger.log('🚀 Starting event types synchronization...');

            // Charger la configuration
            const config = await this.loadConfiguration(options?.config);
            if (!config) {
                this.logger.error('❌ No configuration found');
                process.exit(1);
            }

            // Backup si demandé
            if (options?.backup) {
                await this.createBackup();
            }

            // Dry run ou synchronisation réelle
            if (options?.dryRun) {
                await this.performDryRun(config, options);
            } else {
                await this.performSync(config, options);
            }

            this.logger.log('✅ Event types synchronization completed successfully');

        } catch (error) {
            this.logger.error('❌ Synchronization failed:', error.message);
            if (options?.verbose) {
                this.logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Charger la configuration depuis un fichier
     */
    private async loadConfiguration(configPath?: string): Promise<EventTypesConfig<EventPayloads> | null> {
        const possiblePaths = [
            configPath,
            './src/config/events.config.ts',
            './src/config/events.config.js',
            './config/events.config.ts',
            './config/events.config.js',
            './events.config.ts',
            './events.config.js'
        ].filter(Boolean);

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                this.logger.debug(`📂 Loading configuration from: ${filePath}`);

                try {
                    // Require dynamique pour supporter TypeScript et JavaScript
                    const configModule = require(path.resolve(filePath));
                    const config = configModule.default || configModule.eventTypesConfig || configModule;

                    if (this.isValidEventTypesConfig(config)) {
                        this.logger.log(`✅ Configuration loaded from: ${filePath}`);
                        return config;
                    } else {
                        this.logger.warn(`⚠️  Invalid configuration format in: ${filePath}`);
                    }
                } catch (error) {
                    this.logger.warn(`⚠️  Failed to load configuration from ${filePath}: ${error.message}`);
                }
            }
        }

        this.logger.error('❌ No valid configuration file found');
        this.logger.log('📖 Expected locations:');
        possiblePaths.forEach(p => p && this.logger.log(`   - ${p}`));

        return null;
    }

    /**
     * Valider le format de la configuration
     */
    private isValidEventTypesConfig(config: any): config is EventTypesConfig<EventPayloads> {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Vérifier que chaque clé a une configuration valide
        for (const [eventType, eventConfig] of Object.entries(config)) {
            if (!eventConfig || typeof eventConfig !== 'object') {
                this.logger.warn(`Invalid config for event type: ${eventType}`);
                return false;
            }

            const { description, channels } = eventConfig as any;
            if (!description || !Array.isArray(channels) || channels.length === 0) {
                this.logger.warn(`Missing description or channels for event type: ${eventType}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Créer une sauvegarde de la configuration actuelle
     */
    private async createBackup(): Promise<void> {
        this.logger.log('💾 Creating backup of current event types...');

        const repository = this.dataSource.getRepository(EventTypeEntity);
        const existingEventTypes = await repository.find();

        const backupData = {
            timestamp: new Date().toISOString(),
            eventTypes: existingEventTypes
        };

        const backupFileName = `event-types-backup-${Date.now()}.json`;
        const backupPath = path.resolve(backupFileName);

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        this.logger.log(`✅ Backup created: ${backupPath}`);
    }

    /**
     * Effectuer un dry run pour voir les changements sans les appliquer
     */
    private async performDryRun(
        config: EventTypesConfig<EventPayloads>,
        options?: SyncCommandOptions
    ): Promise<void> {
        this.logger.log('🔍 Performing dry run (no changes will be made)...');

        const repository = this.dataSource.getRepository(EventTypeEntity);
        const existingEventTypes = await repository.find();
        const existingEventTypesMap = new Map(existingEventTypes.map(et => [et.name, et]));

        const changes = {
            toCreate: [],
            toUpdate: [],
            toDelete: []
        };

        // Identifier les changements
        for (const [eventTypeName, eventConfig] of Object.entries(config)) {
            const existing = existingEventTypesMap.get(eventTypeName);

            if (!existing) {
                changes.toCreate.push(eventTypeName);
            } else {
                const hasChanges = this.hasConfigurationChanges(existing, eventConfig);
                if (hasChanges) {
                    changes.toUpdate.push(eventTypeName);
                }
            }
        }

        // Types à supprimer (présents en DB mais pas dans la config)
        for (const existing of existingEventTypes) {
            if (!config[existing.name]) {
                changes.toDelete.push(existing.name);
            }
        }

        // Afficher le résumé
        this.logger.log('\n📊 Summary of changes:');
        this.logger.log(`   ➕ To create: ${changes.toCreate.length}`);
        this.logger.log(`   🔄 To update: ${changes.toUpdate.length}`);
        this.logger.log(`   ❌ To delete: ${changes.toDelete.length}`);

        if (options?.verbose) {
            if (changes.toCreate.length > 0) {
                this.logger.log('\n➕ Event types to create:');
                changes.toCreate.forEach(name => this.logger.log(`   - ${name}`));
            }

            if (changes.toUpdate.length > 0) {
                this.logger.log('\n🔄 Event types to update:');
                changes.toUpdate.forEach(name => this.logger.log(`   - ${name}`));
            }

            if (changes.toDelete.length > 0) {
                this.logger.log('\n❌ Event types to delete:');
                changes.toDelete.forEach(name => this.logger.log(`   - ${name}`));
            }
        }

        if (changes.toCreate.length === 0 && changes.toUpdate.length === 0 && changes.toDelete.length === 0) {
            this.logger.log('✅ No changes detected - database is up to date');
        }
    }

    /**
     * Effectuer la synchronisation réelle
     */
    private async performSync(
        config: EventTypesConfig<EventPayloads>,
        options?: SyncCommandOptions
    ): Promise<void> {
        this.logger.log('🔄 Synchronizing event types to database...');

        const repository = this.dataSource.getRepository(EventTypeEntity);

        // Utiliser une transaction pour assurer la cohérence
        await this.dataSource.transaction(async (transactionalEntityManager) => {
            const transactionalRepository = transactionalEntityManager.getRepository(EventTypeEntity);

            const existingEventTypes = await transactionalRepository.find();
            const existingEventTypesMap = new Map(existingEventTypes.map(et => [et.name, et]));

            let created = 0;
            let updated = 0;
            let deleted = 0;

            // Créer ou mettre à jour les types d'événements
            for (const [eventTypeName, eventConfig] of Object.entries(config)) {
                const existing = existingEventTypesMap.get(eventTypeName);

                if (!existing) {
                    // Créer nouveau type d'événement
                    const newEventType = this.createEventTypeEntity(eventTypeName, eventConfig);
                    await transactionalRepository.save(newEventType);
                    created++;

                    if (options?.verbose) {
                        this.logger.log(`➕ Created: ${eventTypeName}`);
                    }
                } else {
                    // Mettre à jour si nécessaire
                    const hasChanges = this.hasConfigurationChanges(existing, eventConfig);
                    if (hasChanges || options?.force) {
                        this.updateEventTypeEntity(existing, eventConfig);
                        await transactionalRepository.save(existing);
                        updated++;

                        if (options?.verbose) {
                            this.logger.log(`🔄 Updated: ${eventTypeName}`);
                        }
                    }
                }
            }

            // Supprimer les types d'événements qui ne sont plus dans la config
            if (options?.force) {
                for (const existing of existingEventTypes) {
                    if (!config[existing.name]) {
                        await transactionalRepository.remove(existing);
                        deleted++;

                        if (options?.verbose) {
                            this.logger.log(`❌ Deleted: ${existing.name}`);
                        }
                    }
                }
            }

            this.logger.log('\n📊 Synchronization summary:');
            this.logger.log(`   ➕ Created: ${created}`);
            this.logger.log(`   🔄 Updated: ${updated}`);
            this.logger.log(`   ❌ Deleted: ${deleted}`);
        });
    }

    /**
     * Créer une nouvelle entité EventType
     */
    private createEventTypeEntity(name: string, config: any): EventTypeEntity {
        const entity = new EventTypeEntity();
        entity.name = name;
        entity.description = config.description;
        entity.channels = config.channels;
        entity.defaultProcessing = config.defaultProcessing || 'async';
        entity.waitForResult = config.waitForResult || false;
        entity.retryAttempts = config.retryAttempts || 3;
        entity.priority = config.priority || 'normal';
        entity.delay = config.delay || null;
        entity.timeout = config.timeout || 30000;
        entity.schema = config.schema || null;
        entity.templates = config.templates || null;
        entity.isActive = true;
        entity.createdBy = 'cli-sync';
        entity.updatedBy = 'cli-sync';

        return entity;
    }

    /**
     * Mettre à jour une entité EventType existante
     */
    private updateEventTypeEntity(entity: EventTypeEntity, config: any): void {
        entity.description = config.description;
        entity.channels = config.channels;
        entity.defaultProcessing = config.defaultProcessing || 'async';
        entity.waitForResult = config.waitForResult || false;
        entity.retryAttempts = config.retryAttempts || 3;
        entity.priority = config.priority || 'normal';
        entity.delay = config.delay || null;
        entity.timeout = config.timeout || 30000;
        entity.schema = config.schema || null;
        entity.templates = config.templates || null;
        entity.updatedBy = 'cli-sync';
    }

    /**
     * Vérifier si la configuration a changé
     */
    private hasConfigurationChanges(entity: EventTypeEntity, config: any): boolean {
        return (
            entity.description !== config.description ||
            JSON.stringify(entity.channels) !== JSON.stringify(config.channels) ||
            entity.defaultProcessing !== (config.defaultProcessing || 'async') ||
            entity.waitForResult !== (config.waitForResult || false) ||
            entity.retryAttempts !== (config.retryAttempts || 3) ||
            entity.priority !== (config.priority || 'normal') ||
            entity.delay !== (config.delay || null) ||
            entity.timeout !== (config.timeout || 30000) ||
            JSON.stringify(entity.schema) !== JSON.stringify(config.schema || null) ||
            JSON.stringify(entity.templates) !== JSON.stringify(config.templates || null)
        );
    }

    @Option({
        flags: '-c, --config <path>',
        description: 'Path to the configuration file',
    })
    parseConfig(val: string): string {
        return val;
    }

    @Option({
        flags: '-d, --dry-run',
        description: 'Show what would be changed without making changes',
    })
    parseDryRun(): boolean {
        return true;
    }

    @Option({
        flags: '-f, --force',
        description: 'Force update even if no changes detected and delete removed event types',
    })
    parseForce(): boolean {
        return true;
    }

    @Option({
        flags: '-b, --backup',
        description: 'Create a backup before synchronization',
    })
    parseBackup(): boolean {
        return true;
    }

    @Option({
        flags: '-v, --verbose',
        description: 'Enable verbose output',
    })
    parseVerbose(): boolean {
        return true;
    }
}

// src/index.ts
// ================================
// EXPORTS PRINCIPAUX DU PACKAGE
// ================================

// Module principal
export { EventNotificationsModule } from './module/event-notifications.module';

// Services
export { EventEmitterService } from './services/event-emitter.service';
export { EventRoutingService } from './services/event-routing.service';
export { QueueService } from './services/queue.service';
export { RetryService } from './services/retry.service';

// Types et interfaces publiques
export {
    // Types de base
    EventPayloads,
    NotificationChannel,
    ProcessingMode,
    EventPriority,

    // Configuration
    EventTypeConfig,
    EventTypesConfig,
    NotificationProviderConfig,
    QueueConfig,
    PackageConfig,
    RetryPolicy,

    // Options et résultats
    EmitOptions,
    NotificationResult,
    EventEmissionResult,
    NotificationContext,
    QueuedEvent,

    // Provider interface
    NotificationProvider,

    // Stats et monitoring
    ProviderStats,
    SystemEvent
} from './types/interfaces';

// Providers
export { SmtpEmailProvider, SmtpConfig, EmailPayload } from './providers/email/smtp-email.provider';
export { HttpWebhookProvider, WebhookConfig, WebhookPayload } from './providers/webhook/http-webhook.provider';
export { ExternalServiceProvider, ExternalServiceConfig, ExternalServicePayload } from './providers/external-service/firebase-like.provider';

// Entités (pour les utilisateurs qui veulent les étendre)
export {
    EventTypeEntity,
    EventLogEntity,
    NotificationResultEntity,
    ProviderHealthEntity,
    EventStatsEntity
} from './entities';

// Commandes CLI
export { SyncEventTypesCommand } from './commands/sync-event-types.command';

// Tokens d'injection
export {
    EVENT_NOTIFICATIONS_CONFIG,
    EVENT_TYPES_CONFIG,
    PROVIDERS_CONFIG
} from './module/event-notifications.module';

// ================================
// HELPERS ET UTILS
// ================================

/**
 * Helper pour créer une configuration d'événement type-safe
 */
export function createEventTypeConfig<T extends EventPayloads>(
    config: EventTypesConfig<T>
): EventTypesConfig<T> {
    return config;
}

/**
 * Helper pour créer une configuration de provider
 */
export function createProviderConfig(
    providers: Record<string, NotificationProviderConfig>
): Record<string, NotificationProviderConfig> {
    return providers;
}

/**
 * Helper pour créer une configuration complète du package
 */
export function createPackageConfig<T extends EventPayloads>(
    config: PackageConfig<T>
): PackageConfig<T> {
    // Validation basique de la configuration
    if (!config.eventTypes || Object.keys(config.eventTypes).length === 0) {
        throw new Error('At least one event type must be configured');
    }

    if (!config.providers || Object.keys(config.providers).length === 0) {
        throw new Error('At least one provider must be configured');
    }

    // Valider que tous les canaux utilisés ont des providers
    const configuredChannels = new Set<string>();
    const availableChannels = new Set<string>();

    // Collecter les canaux utilisés dans les événements
    Object.values(config.eventTypes).forEach(eventConfig => {
        eventConfig.channels.forEach(channel => configuredChannels.add(channel));
    });

    // Collecter les canaux disponibles dans les providers
    Object.entries(config.providers).forEach(([channelName, providerConfig]) => {
        if (providerConfig.enabled !== false) {
            availableChannels.add(channelName);
        }
    });

    // Vérifier que tous les canaux utilisés ont des providers
    const missingProviders = Array.from(configuredChannels).filter(
        channel => !availableChannels.has(channel)
    );

    if (missingProviders.length > 0) {
        throw new Error(
            `Missing providers for channels: ${missingProviders.join(', ')}. ` +
            `Configure providers for these channels or remove them from event configurations.`
        );
    }

    return config;
}

/**
 * Version du package
 */
export const VERSION = '1.0.0';

/**
 * Informations du package
 */
export const PACKAGE_INFO = {
    name: '@afidos/nestjs-event-notifications',
    version: VERSION,
    description: 'Enterprise-grade event and notification system for NestJS applications',
    author: 'Afidos',
    repository: 'https://github.com/afidos/nestjs-event-notifications'
} as const;

// examples/basic-usage/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    EventNotificationsModule,
    EventPayloads,
    PackageConfig,
    createPackageConfig,
    createEventTypeConfig
} from '@afidos/nestjs-event-notifications';
import { UserService } from './user.service';
import { OrderService } from './order.service';

// 1. Définir les types d'événements de l'application
interface MyAppEvents extends EventPayloads {
    'user.welcome': {
        userId: number;
        email: string;
        firstName: string;
        lastName: string;
    };
    'user.password.reset': {
        userId: number;
        email: string;
        resetToken: string;
    };
    'order.created': {
        orderId: string;
        customerId: number;
        amount: number;
        items: Array<{ productId: string; quantity: number; price: number; }>;
    };
    'order.completed': {
        orderId: string;
        customerId: number;
        amount: number;
        paymentMethod: string;
    };
    'notification.urgent': {
        recipientId: number;
        message: string;
        level: 'warning' | 'error' | 'critical';
    };
}

// 2. Configuration des types d'événements
const eventTypesConfig = createEventTypeConfig<MyAppEvents>({
    'user.welcome': {
        description: 'Send welcome email to new user',
        channels: ['email'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 3,
        priority: 'normal'
    },
    'user.password.reset': {
        description: 'Send password reset email',
        channels: ['email'],
        defaultProcessing: 'sync',
        waitForResult: true,
        retryAttempts: 5,
        priority: 'high',
        timeout: 15000
    },
    'order.created': {
        description: 'Notify about new order creation',
        channels: ['webhook', 'external-service'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 3
    },
    'order.completed': {
        description: 'Notify order completion',
        channels: ['email', 'webhook'],
        defaultProcessing: 'sync',
        waitForResult: true,
        retryAttempts: 3,
        timeout: 10000
    },
    'notification.urgent': {
        description: 'Send urgent notifications',
        channels: ['email', 'external-service'],
        defaultProcessing: 'sync',
        waitForResult: true,
        priority: 'high',
        retryAttempts: 5,
        timeout: 5000
    }
});

// 3. Configuration complète du package
const packageConfig = createPackageConfig<MyAppEvents>({
    eventTypes: eventTypesConfig,

    providers: {
        email: {
            driver: 'smtp',
            config: {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                from: process.env.SMTP_FROM || 'noreply@myapp.com'
            }
        },
        webhook: {
            driver: 'http',
            config: {
                endpoint: process.env.WEBHOOK_URL || 'https://api.myapp.com/webhooks/notifications',
                method: 'POST',
                headers: {
                    'X-API-Key': process.env.WEBHOOK_API_KEY
                },
                timeout: 10000,
                auth: {
                    type: 'bearer',
                    token: process.env.WEBHOOK_TOKEN
                }
            }
        },
        'external-service': {
            driver: 'firebase-like',
            config: {
                endpoint: process.env.FIREBASE_LIKE_URL || 'https://api.notifications.com',
                apiKey: process.env.FIREBASE_LIKE_KEY,
                timeout: 15000,
                batchSize: 500
            }
        }
    },

    queue: {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        },
        concurrency: 5,
        prefix: 'myapp-notifications',
        defaultJobOptions: {
            attempts: 3,
            delay: 1000,
            removeOnComplete: 100,
            removeOnFail: 50
        }
    },

    mode: 'hybrid',

    global: {
        defaultTimeout: 30000,
        defaultRetryAttempts: 3,
        enableDetailedLogs: process.env.NODE_ENV === 'development'
    }
});

@Module({
    imports: [
        // Configuration TypeORM
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'myapp',
            autoLoadEntities: true,
            synchronize: process.env.NODE_ENV === 'development'
        }),

        // Configuration du package EventNotifications
        EventNotificationsModule.forRoot<MyAppEvents>(packageConfig)
    ],
    providers: [UserService, OrderService],
    exports: [UserService, OrderService]
})
export class AppModule {}

// examples/basic-usage/user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { User } from './entities/user.entity';

interface CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private eventEmitter: EventEmitterService<MyAppEvents>
    ) {}

    /**
     * Créer un nouvel utilisateur avec envoi d'email de bienvenue
     */
    async createUser(createUserDto: CreateUserDto): Promise<User> {
        try {
            // 1. Créer l'utilisateur en base
            const user = this.userRepository.create({
                email: createUserDto.email,
                firstName: createUserDto.firstName,
                lastName: createUserDto.lastName,
                passwordHash: await this.hashPassword(createUserDto.password)
            });

            const savedUser = await this.userRepository.save(user);
            this.logger.log(`User created: ${savedUser.id}`);

            // 2. Émettre l'événement de bienvenue (async)
            await this.eventEmitter.emitAsync('user.welcome', {
                userId: savedUser.id,
                email: savedUser.email,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName
            });

            return savedUser;

        } catch (error) {
            this.logger.error('Failed to create user', {
                email: createUserDto.email,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Réinitialiser le mot de passe avec envoi d'email synchrone
     */
    async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string }> {
        try {
            const user = await this.userRepository.findOne({ where: { email } });
            if (!user) {
                return { success: false };
            }

            // Générer un token de reset
            const resetToken = await this.generateResetToken();

            // Sauvegarder le token
            user.resetToken = resetToken;
            user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure
            await this.userRepository.save(user);

            // Émettre l'événement de reset (sync pour s'assurer que l'email est envoyé)
            const result = await this.eventEmitter.emitSync('user.password.reset', {
                userId: user.id,
                email: user.email,
                resetToken
            });

            // Vérifier que l'email a été envoyé avec succès
            const emailSent = result.results?.some(r =>
                r.channel === 'email' && r.status === 'sent'
            );

            if (!emailSent) {
                this.logger.error('Failed to send password reset email', {
                    userId: user.id,
                    email: user.email,
                    results: result.results
                });
                return { success: false };
            }

            this.logger.log(`Password reset email sent successfully`, {
                userId: user.id,
                email: user.email
            });

            return { success: true, token: resetToken };

        } catch (error) {
            this.logger.error('Failed to request password reset', {
                email,
                error: error.message
            });
            return { success: false };
        }
    }

    private async hashPassword(password: string): Promise<string> {
        // Implémentation du hashage
        return `hashed_${password}`;
    }

    private async generateResetToken(): Promise<string> {
        // Génération sécurisée du token
        return `reset_${Date.now()}_${Math.random().toString(36)}`;
    }
}

// examples/basic-usage/order.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { Order } from './entities/order.entity';

interface CreateOrderDto {
    customerId: number;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
}

interface CompleteOrderDto {
    orderId: string;
    paymentMethod: string;
}

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        private eventEmitter: EventEmitterService<MyAppEvents>
    ) {}

    /**
     * Créer une nouvelle commande
     */
    async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
        try {
            const amount = createOrderDto.items.reduce(
                (total, item) => total + (item.price * item.quantity),
                0
            );

            const order = this.orderRepository.create({
                customerId: createOrderDto.customerId,
                amount,
                items: createOrderDto.items,
                status: 'pending'
            });

            const savedOrder = await this.orderRepository.save(order);

            // Émettre l'événement de création (async)
            await this.eventEmitter.emitAsync('order.created', {
                orderId: savedOrder.id,
                customerId: savedOrder.customerId,
                amount: savedOrder.amount,
                items: createOrderDto.items
            });

            this.logger.log(`Order created: ${savedOrder.id}`);
            return savedOrder;

        } catch (error) {
            this.logger.error('Failed to create order', {
                customerId: createOrderDto.customerId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Finaliser une commande avec vérification des notifications
     */
    async completeOrder(completeOrderDto: CompleteOrderDto): Promise<{
        order: Order;
        notificationsSent: boolean;
    }> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: completeOrderDto.orderId }
            });

            if (!order) {
                throw new Error(`Order not found: ${completeOrderDto.orderId}`);
            }

            // Mettre à jour le statut de la commande
            order.status = 'completed';
            order.paymentMethod = completeOrderDto.paymentMethod;
            order.completedAt = new Date();

            const savedOrder = await this.orderRepository.save(order);

            // Émettre l'événement de finalisation (sync avec attente)
            const result = await this.eventEmitter.emitAndWait(
                'order.completed',
                {
                    orderId: savedOrder.id,
                    customerId: savedOrder.customerId,
                    amount: savedOrder.amount,
                    paymentMethod: completeOrderDto.paymentMethod
                },
                15000 // timeout 15s
            );

            // Vérifier que toutes les notifications ont été envoyées
            const allNotificationsSent = result.results?.every(r => r.status === 'sent') || false;

            this.logger.log(`Order completed: ${savedOrder.id}`, {
                notificationsSent: allNotificationsSent,
                results: result.results
            });

            return {
                order: savedOrder,
                notificationsSent: allNotificationsSent
            };

        } catch (error) {
            this.logger.error('Failed to complete order', {
                orderId: completeOrderDto.orderId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Envoyer une notification urgente
     */
    async sendUrgentNotification(
        recipientId: number,
        message: string,
        level: 'warning' | 'error' | 'critical'
    ): Promise<boolean> {
        try {
            const result = await this.eventEmitter.emitSync('notification.urgent', {
                recipientId,
                message,
                level
            });

            const success = result.results?.every(r => r.status === 'sent') || false;

            this.logger.log(`Urgent notification sent`, {
                recipientId,
                level,
                success,
                duration: result.processingDuration
            });

            return success;

        } catch (error) {
            this.logger.error('Failed to send urgent notification', {
                recipientId,
                level,
                error: error.message
            });
            return false;
        }
    }
}

// examples/advanced-usage/custom-provider.ts
import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationProvider,
    NotificationResult,
    NotificationContext,
    NotificationChannel
} from '@afidos/nestjs-event-notifications';
import { SlackApi } from 'slack-api';

export interface SlackConfig {
    botToken: string;
    defaultChannel: string;
    username?: string;
    iconEmoji?: string;
}

export interface SlackPayload {
    channel?: string;
    text: string;
    attachments?: any[];
    blocks?: any[];
    threadTs?: string;
}

/**
 * Provider custom pour Slack
 */
@Injectable()
export class SlackProvider implements NotificationProvider {
    readonly name = 'slack';
    readonly channel: NotificationChannel = 'external-service'; // Utiliser le canal le plus proche

    private readonly logger = new Logger(SlackProvider.name);
    private slackApi: SlackApi;

    constructor(private config: SlackConfig) {
        this.slackApi = new SlackApi(config.botToken);
    }

    async send(payload: SlackPayload, context: NotificationContext): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            this.logger.debug('Sending Slack message', {
                correlationId: context.correlationId,
                channel: payload.channel || this.config.defaultChannel
            });

            const result = await this.slackApi.chat.postMessage({
                channel: payload.channel || this.config.defaultChannel,
                text: payload.text,
                username: this.config.username,
                icon_emoji: this.config.iconEmoji,
                attachments: payload.attachments,
                blocks: payload.blocks,
                thread_ts: payload.threadTs
            });

            const duration = Date.now() - startTime;

            return {
                channel: this.channel,
                provider: this.name,
                status: 'sent',
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    messageTs: result.ts,
                    channel: result.channel,
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('Failed to send Slack message', {
                correlationId: context.correlationId,
                error: error.message,
                duration
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: { duration }
            };
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.slackApi.auth.test();
            return true;
        } catch (error) {
            this.logger.warn('Slack health check failed', {
                error: error.message
            });
            return false;
        }
    }

    validateConfig(config: SlackConfig): boolean | string[] {
        const errors: string[] = [];

        if (!config.botToken) {
            errors.push('botToken is required');
        }

        if (!config.defaultChannel) {
            errors.push('defaultChannel is required');
        }

        return errors.length === 0 ? true : errors;
    }
}

// examples/advanced-usage/app-with-custom-provider.module.ts
import { Module } from '@nestjs/common';
import {
    EventNotificationsModule,
    EventRoutingService
} from '@afidos/nestjs-event-notifications';
import { SlackProvider } from './custom-provider';

@Module({
    imports: [
        EventNotificationsModule.forRoot<MyAppEvents>({
            // ... configuration de base
            eventTypes: {
                'alert.system': {
                    description: 'System alerts',
                    channels: ['slack'],
                    defaultProcessing: 'sync',
                    waitForResult: true
                }
            },
            providers: {
                // Providers standard
                email: { /* config */ },

                // Provider custom Slack
                slack: {
                    driver: 'custom',
                    config: {
                        botToken: process.env.SLACK_BOT_TOKEN,
                        defaultChannel: '#alerts',
                        username: 'MyApp Bot',
                        iconEmoji: ':robot_face:'
                    }
                }
            }
        })
    ],
    providers: [
        // Enregistrement manual du provider custom
        {
            provide: 'SLACK_PROVIDER',
            useFactory: (routingService: EventRoutingService) => {
                const provider = new SlackProvider({
                    botToken: process.env.SLACK_BOT_TOKEN,
                    defaultChannel: '#alerts',
                    username: 'MyApp Bot',
                    iconEmoji: ':robot_face:'
                });

                routingService.registerProvider(provider);
                return provider;
            },
            inject: [EventRoutingService]
        }
    ]
})
export class AppWithCustomProviderModule {}

// examples/configuration/events.config.ts
// Fichier de configuration pour la CLI
import { createEventTypeConfig } from '@afidos/nestjs-event-notifications';

export default createEventTypeConfig({
    'user.welcome': {
        description: 'Send welcome email to new user',
        channels: ['email'],
        defaultProcessing: 'async',
        retryAttempts: 3
    },
    'order.created': {
        description: 'Notify about new order',
        channels: ['webhook', 'external-service'],
        defaultProcessing: 'async',
        retryAttempts: 3
    },
    'system.alert': {
        description: 'System alert notification',
        channels: ['email', 'slack'],
        defaultProcessing: 'sync',
        waitForResult: true,
        priority: 'high',
        retryAttempts: 5
    }
});

// Usage de la CLI:
// npx nest-commander sync-event-types --config ./examples/configuration/events.config.ts --dry-run
// npx nest-commander sync-event-types --force --backup --verbose


// tsconfig.json
{
    "compilerOptions": {
    "target": "ES2021",
        "lib": ["ES2021"],
        "module": "commonjs",
        "moduleResolution": "node",
        "declaration": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
},
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}

// package.json
{
    "name": "@afidos/nestjs-event-notifications",
    "version": "1.0.0",
    "description": "Enterprise-grade event and notification system for NestJS applications",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
    "build": "tsc",
        "start": "node dist/index.js",
        "start:dev": "ts-node src/index.ts",
        "test": "jest",
        "lint": "eslint src/**/*.ts --fix",
        "cli:sync": "ts-node src/commands/sync-event-types.command.ts"
},
    "keywords": ["nestjs", "events", "notifications", "typescript"],
    "author": "Afidos",
    "license": "MIT",
    "peerDependencies": {
    "@nestjs/common": "^10.0.0",
        "@nestjs/core": "^10.0.0",
        "@nestjs/typeorm": "^10.0.0",
        "@nestjs/bull": "^10.0.0",
        "typeorm": "^0.3.0",
        "bull": "^4.10.0"
},
    "dependencies": {
    "joi": "^17.9.0",
        "uuid": "^9.0.0",
        "axios": "^1.5.0"
},
    "optionalDependencies": {
    "nodemailer": "^6.9.0"
},
    "devDependencies": {
    "@types/node": "^20.0.0",
        "@types/jest": "^29.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "eslint": "^8.0.0",
        "jest": "^29.0.0",
        "ts-jest": "^29.0.0",
        "ts-node": "^10.9.0",
        "typescript": "^5.0.0",
        "nest-commander": "^3.11.0"
}
}

// .eslintrc.js
module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: ['.eslintrc.js', 'dist/'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'error'
    }
};

// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.spec.ts', '**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/index.ts'
    ],
    coverageDirectory: 'coverage'
};
// .gitignore
node_modules/
dist/
coverage/
*.log
    .env*
.DS_Store
*.tsbuildinfo

// .env.example
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=notifications

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourapp.com

# Webhook
WEBHOOK_URL=https://api.yourapp.com/webhook
WEBHOOK_TOKEN=your-token

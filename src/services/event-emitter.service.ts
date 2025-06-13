import {Inject, Injectable, Logger} from '@nestjs/common';
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
import {EVENT_TYPES_CONFIG} from "../module/event-notifications.module";

/**
 * Service principal pour l'émission d'événements avec type safety
 */
@Injectable()
export class EventEmitterService<T extends EventPayloads = EventPayloads> {
    private readonly logger = new Logger(EventEmitterService.name);

    constructor(
        @Inject(EVENT_TYPES_CONFIG) private readonly eventConfig: EventTypesConfig<T>,
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

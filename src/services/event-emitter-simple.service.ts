import { Injectable, Logger, Inject } from '@nestjs/common';
import {
    EventPayloads,
    EventTypesConfig,
    EmitOptions,
    EventEmissionResult,
    NotificationContext
} from '../types/interfaces';
import { EVENT_TYPES_CONFIG } from '../module/event-notifications.module';
import { NotificationOrchestratorService } from './notification-orchestrator.service';

/**
 * Service d'émission d'événements simplifié
 * Directement intégré avec l'orchestrateur, sans queue pour éliminer les dépendances circulaires
 */
@Injectable()
export class EventEmitterSimpleService<T extends EventPayloads = EventPayloads> {
    private readonly logger = new Logger(EventEmitterSimpleService.name);

    constructor(
        @Inject(EVENT_TYPES_CONFIG) private readonly eventConfig: EventTypesConfig<T>,
        private readonly orchestrator: NotificationOrchestratorService
    ) {}

    /**
     * Émet un événement de manière asynchrone (traitement immédiat)
     */
    async emitAsync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        return await this.emitInternal(eventType, payload, options, 'async');
    }

    /**
     * Émet un événement de manière synchrone
     */
    async emitSync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        return await this.emitInternal(eventType, payload, options, 'sync');
    }

    /**
     * Émission interne commune
     */
    private async emitInternal<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions,
        mode: 'sync' | 'async'
    ): Promise<EventEmissionResult> {
        this.validateEventType(eventType);
        
        const eventId = this.generateEventId();
        const correlationId = options.correlationId || this.generateCorrelationId();
        
        const context: NotificationContext = {
            eventId,
            correlationId,
            attempt: 1,
            eventType: eventType.toString(),
            metadata: options.metadata || {}
        };

        this.logger.debug(`Émission événement ${mode}: ${eventType.toString()}`, { eventId, correlationId });

        try {
            // Traitement direct par l'orchestrateur
            const results = await this.orchestrator.processEvent(
                eventType.toString(),
                payload,
                context
            );

            return {
                eventId,
                correlationId,
                mode,
                waitedForResult: true,
                results,
                processedAt: new Date()
            };
            
        } catch (error) {
            this.logger.error(`Erreur lors de l'émission de l'événement ${eventType.toString()}: ${error.message}`);
            
            return {
                eventId,
                correlationId,
                mode,
                waitedForResult: true,
                results: [],
                processedAt: new Date(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Valide qu'un type d'événement est configuré
     */
    private validateEventType<K extends keyof T>(eventType: K): void {
        if (!this.eventConfig[eventType]) {
            throw new Error(`Type d'événement non configuré: ${eventType.toString()}`);
        }
    }

    /**
     * Obtient la configuration d'un type d'événement
     */
    getEventConfig<K extends keyof T>(eventType: K) {
        return this.eventConfig[eventType];
    }

    /**
     * Liste tous les types d'événements configurés
     */
    getAvailableEventTypes(): Array<keyof T> {
        return Object.keys(this.eventConfig) as Array<keyof T>;
    }

    /**
     * Génère un ID unique pour l'événement
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Génère un ID de corrélation unique
     */
    private generateCorrelationId(): string {
        return `cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
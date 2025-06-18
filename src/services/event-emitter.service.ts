import { Injectable, Logger, Inject } from '@nestjs/common';
import {
    EventPayloads,
    EventTypesConfig,
    EmitOptions,
    ProcessingMode,
    EventEmissionResult,
    NotificationResult,
    NotificationContext,
    QueuedEvent
} from '../types/interfaces';
import {EVENT_TYPES_CONFIG} from "../module/event-notifications.module";
import { NotificationOrchestratorService } from './notification-orchestrator.service';
import { QueueManagerService } from './queue-manager.service';

/**
 * Service principal pour l'émission d'événements avec type safety
 * Version simplifiée sans routing ni queue complexe
 */
@Injectable()
export class EventEmitterService<T extends EventPayloads = EventPayloads> {
    private readonly logger = new Logger(EventEmitterService.name);

    constructor(
        @Inject(EVENT_TYPES_CONFIG) private readonly eventConfig: EventTypesConfig<T>,
        private readonly queueManager: QueueManagerService
    ) {}

    /**
     * Émet un événement de manière asynchrone
     */
    async emitAsync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        const startTime = Date.now();
        const eventId = this.generateEventId();
        const correlationId = options.correlationId || this.generateCorrelationId();

        this.logger.debug(`Emitting async event: ${eventType.toString()}`, {
            eventId,
            correlationId,
            payload
        });

        const context: NotificationContext = {
            eventId,
            correlationId,
            attempt: 1,
            eventType: eventType.toString(),
            metadata: options.metadata || {}
        };

        // Délègue au QueueManager qui décidera du traitement (immédiat ou queue)
        return await this.queueManager.processEvent(
            eventType.toString(),
            payload,
            context,
            options
        );
    }

    /**
     * Émet un événement de manière synchrone et attend le résultat
     */
    async emitSync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        const startTime = Date.now();
        const eventId = this.generateEventId();
        const correlationId = options.correlationId || this.generateCorrelationId();

        this.logger.debug(`Emitting sync event: ${eventType.toString()}`, {
            eventId,
            correlationId,
            payload
        });

        const context: NotificationContext = {
            eventId,
            correlationId,
            attempt: 1,
            eventType: eventType.toString(),
            metadata: options.metadata || {}
        };

        // Force le mode sync pour emitSync
        return await this.queueManager.processEvent(
            eventType.toString(),
            payload,
            context,
            { ...options, mode: 'sync' }
        );
    }

    /**
     * Émet un événement et attend le résultat (alias pour emitSync)
     */
    async emitAndWait<K extends keyof T>(
        eventType: K,
        payload: T[K],
        timeout?: number
    ): Promise<EventEmissionResult> {
        return this.emitSync(eventType, payload, { timeout });
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

    /**
     * Valide la configuration d'un événement
     */
    private validateEventType<K extends keyof T>(eventType: K): void {
        if (!this.eventConfig[eventType]) {
            throw new Error(`Event type "${eventType.toString()}" is not configured`);
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
}
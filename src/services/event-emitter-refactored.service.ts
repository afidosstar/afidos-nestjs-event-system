import { Injectable, Logger, Inject } from '@nestjs/common';
import {
    EventPayloads,
    EventTypesConfig,
    EmitOptions,
    EventEmissionResult
} from '../types/interfaces';
import { EVENT_TYPES_CONFIG } from '../module/event-notifications-refactored.module';
import { EventBusService } from './event-bus.service';

/**
 * Service d'émission d'événements refactorisé
 * Utilise EventBus pour éviter les dépendances circulaires
 */
@Injectable()
export class EventEmitterService<T extends EventPayloads = EventPayloads> {
    private readonly logger = new Logger(EventEmitterService.name);

    constructor(
        @Inject(EVENT_TYPES_CONFIG) private readonly eventConfig: EventTypesConfig<T>,
        private readonly eventBus: EventBusService<T>
    ) {}

    /**
     * Émet un événement de manière asynchrone
     */
    async emitAsync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        this.validateEventType(eventType);
        
        this.logger.debug(`Émission événement async: ${eventType.toString()}`);
        
        return await this.eventBus.publish(eventType, payload, {
            ...options,
            mode: 'async'
        });
    }

    /**
     * Émet un événement de manière synchrone
     */
    async emitSync<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        this.validateEventType(eventType);
        
        this.logger.debug(`Émission événement sync: ${eventType.toString()}`);
        
        return await this.eventBus.publish(eventType, payload, {
            ...options,
            mode: 'sync'
        });
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
     * Valide qu'un type d'événement est configuré
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

    /**
     * Retourne les statistiques du bus d'événements
     */
    getStats() {
        return this.eventBus.getStats();
    }
}
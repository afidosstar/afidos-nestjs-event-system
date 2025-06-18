import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    EventPayloads,
    EmitOptions,
    EventEmissionResult,
    NotificationContext
} from '../types/interfaces';
import { EventHandlerRegistryService } from './event-handler-registry.service';

/**
 * Service EventBus central pour découpler les communications
 * Utilise le pattern Mediator pour éviter les dépendances circulaires
 */
@Injectable()
export class EventBusService<T extends EventPayloads = EventPayloads> implements OnModuleInit {
    private readonly logger = new Logger(EventBusService.name);
    
    // Handlers pour les événements (legacy - pour la compatibilité)
    private eventHandlers = new Map<string, Array<(payload: any, context: NotificationContext) => Promise<any>>>();

    constructor(private readonly handlerRegistry: EventHandlerRegistryService) {}

    async onModuleInit() {
        this.logger.log('EventBus initialisé avec HandlerRegistry');
    }
    
    /**
     * Enregistre un handler pour un type d'événement
     */
    subscribe(eventType: string, handler: (payload: any, context: NotificationContext) => Promise<any>): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)!.push(handler);
        this.logger.debug(`Handler enregistré pour l'événement: ${eventType}`);
    }

    /**
     * Publie un événement vers tous les handlers
     */
    async publish<K extends keyof T>(
        eventType: K,
        payload: T[K],
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        const eventId = this.generateEventId();
        const correlationId = options.correlationId || this.generateCorrelationId();
        
        const context: NotificationContext = {
            eventId,
            correlationId,
            attempt: 1,
            eventType: eventType.toString(),
            metadata: options.metadata || {}
        };

        this.logger.debug(`Publishing event: ${eventType.toString()}`, { eventId, correlationId });

        // Utilise le registry pour récupérer les handlers
        const registryHandlers = this.handlerRegistry.getHandlers(eventType.toString());
        const legacyHandlers = this.eventHandlers.get(eventType.toString()) || [];
        
        if (registryHandlers.length === 0 && legacyHandlers.length === 0) {
            this.logger.warn(`Aucun handler trouvé pour l'événement: ${eventType.toString()}`);
            return {
                eventId,
                correlationId,
                mode: 'sync',
                waitedForResult: true,
                results: [],
                processedAt: new Date()
            };
        }

        try {
            const allResults: any[] = [];

            // Exécute les handlers du registry
            for (const handler of registryHandlers) {
                try {
                    const handlerResults = await handler.handle(eventType.toString(), payload, context);
                    allResults.push(...handlerResults);
                } catch (error) {
                    allResults.push({
                        channel: 'handler-error',
                        provider: handler.getName(),
                        status: 'failed' as const,
                        error: error.message,
                        sentAt: new Date(),
                        attempts: 1
                    });
                }
            }

            // Exécute les handlers legacy en parallèle
            if (legacyHandlers.length > 0) {
                const legacyResults = await Promise.allSettled(
                    legacyHandlers.map(handler => handler(payload, context))
                );

                const legacyNotificationResults = legacyResults.map((result, index) => ({
                    channel: `legacy-handler-${index}`,
                    provider: 'event-bus-legacy',
                    status: result.status === 'fulfilled' ? 'sent' as const : 'failed' as const,
                    sentAt: new Date(),
                    attempts: 1,
                    error: result.status === 'rejected' ? result.reason?.message : undefined
                }));

                allResults.push(...legacyNotificationResults);
            }

            return {
                eventId,
                correlationId,
                mode: 'sync',
                waitedForResult: true,
                results: allResults,
                processedAt: new Date()
            };

        } catch (error) {
            this.logger.error(`Erreur lors du traitement de l'événement ${eventType.toString()}: ${error.message}`);
            
            return {
                eventId,
                correlationId,
                mode: 'sync',
                waitedForResult: true,
                results: [],
                processedAt: new Date(),
                metadata: { error: error.message }
            };
        }
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
     * Retire tous les handlers (pour les tests)
     */
    clear(): void {
        this.eventHandlers.clear();
    }

    /**
     * Retourne les statistiques du bus
     */
    getStats(): { totalHandlers: number; eventTypes: string[] } {
        return {
            totalHandlers: Array.from(this.eventHandlers.values()).reduce((acc, handlers) => acc + handlers.length, 0),
            eventTypes: Array.from(this.eventHandlers.keys())
        };
    }
}
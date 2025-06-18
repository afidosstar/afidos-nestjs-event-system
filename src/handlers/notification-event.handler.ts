import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../interfaces/event-handler.interface';
import { 
    NotificationResult, 
    NotificationContext
} from '../types/interfaces';

/**
 * Handler pour les événements de notification
 * Implémente le pattern EventHandler pour traiter les notifications
 * Version simplifiée sans injection de l'orchestrateur
 */
@Injectable()
export class NotificationEventHandler implements EventHandler {
    private readonly logger = new Logger(NotificationEventHandler.name);
    
    // Reference to orchestrator will be set by the module
    private orchestrator: any;

    constructor() {}

    /**
     * Set the orchestrator reference (called by module after initialization)
     */
    setOrchestrator(orchestrator: any) {
        this.orchestrator = orchestrator;
    }

    /**
     * Retourne tous les types d'événements configurés
     */
    getEventTypes(): string[] {
        // Return generic wildcard to handle all events
        // The orchestrator will validate if the event is configured
        return ['*'];
    }

    /**
     * Traite les notifications pour un événement
     */
    async handle(
        eventType: string, 
        payload: any, 
        context: NotificationContext
    ): Promise<NotificationResult[]> {
        try {
            this.logger.debug(`[NotificationHandler] Traitement de l'événement: ${eventType}`);
            
            if (!this.orchestrator) {
                this.logger.warn(`[NotificationHandler] Orchestrator not available for ${eventType}`);
                return [{
                    channel: 'system',
                    provider: 'notification-handler',
                    status: 'skipped',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: { reason: 'Orchestrator not available' }
                }];
            }
            
            // Délègue à l'orchestrateur (il validera la configuration)
            const results = await this.orchestrator.processEvent(eventType, payload, context);
            
            this.logger.debug(`[NotificationHandler] ${results.length} notifications traitées pour ${eventType}`);
            
            return results;
            
        } catch (error) {
            this.logger.error(`[NotificationHandler] Erreur pour ${eventType}: ${error.message}`);
            
            return [{
                channel: 'system',
                provider: 'notification-handler',
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt
            }];
        }
    }

    /**
     * Nom du handler
     */
    getName(): string {
        return 'NotificationEventHandler';
    }

    /**
     * Priorité du handler
     */
    getPriority(): number {
        return 100; // Priorité normale
    }
}
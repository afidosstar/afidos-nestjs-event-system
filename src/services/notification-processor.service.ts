import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import {
    EventTypesConfig,
    NotificationContext,
    NotificationResult
} from '../types/interfaces';
import { EVENT_TYPES_CONFIG } from '../module/event-notifications-refactored.module';
import { EventBusService } from './event-bus.service';
import { NotificationOrchestratorService } from './notification-orchestrator.service';

/**
 * Service de traitement des notifications
 * S'abonne aux événements via EventBus et déclenche les notifications
 */
@Injectable()
export class NotificationProcessorService implements OnModuleInit {
    private readonly logger = new Logger(NotificationProcessorService.name);

    constructor(
        @Inject(EVENT_TYPES_CONFIG) private readonly eventConfig: EventTypesConfig,
        private readonly eventBus: EventBusService,
        private readonly orchestrator: NotificationOrchestratorService
    ) {}

    /**
     * S'abonne aux événements lors de l'initialisation du module
     */
    async onModuleInit() {
        // S'abonne à tous les types d'événements configurés
        for (const eventType of Object.keys(this.eventConfig)) {
            this.eventBus.subscribe(eventType, async (payload, context) => {
                return await this.processNotifications(eventType, payload, context);
            });
        }

        this.logger.log(`NotificationProcessor initialisé pour ${Object.keys(this.eventConfig).length} types d'événements`);
    }

    /**
     * Traite les notifications pour un événement donné
     */
    private async processNotifications(
        eventType: string,
        payload: any,
        context: NotificationContext
    ): Promise<NotificationResult[]> {
        try {
            this.logger.debug(`Traitement des notifications pour: ${eventType}`);
            
            // Délègue à l'orchestrateur pour le traitement des notifications
            const results = await this.orchestrator.processEvent(eventType, payload, context);
            
            this.logger.debug(`${results.length} notifications traitées pour ${eventType}`);
            
            return results;
        } catch (error) {
            this.logger.error(`Erreur lors du traitement des notifications pour ${eventType}: ${error.message}`);
            
            return [{
                channel: 'unknown',
                provider: 'notification-processor',
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt
            }];
        }
    }

    /**
     * Traite manuellement un événement (pour les tests ou cas spéciaux)
     */
    async processEvent(
        eventType: string,
        payload: any,
        context: NotificationContext
    ): Promise<NotificationResult[]> {
        return await this.processNotifications(eventType, payload, context);
    }
}
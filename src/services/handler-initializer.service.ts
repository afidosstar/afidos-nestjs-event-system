import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventHandlerRegistryService } from './event-handler-registry.service';
import { NotificationEventHandler } from '../handlers/notification-event.handler';
import { NotificationOrchestratorService } from './notification-orchestrator.service';

/**
 * Service d'initialisation des handlers
 * Enregistre automatiquement tous les handlers au démarrage
 */
@Injectable()
export class HandlerInitializerService implements OnModuleInit {
    private readonly logger = new Logger(HandlerInitializerService.name);

    constructor(
        private readonly handlerRegistry: EventHandlerRegistryService,
        private readonly notificationHandler: NotificationEventHandler,
        private readonly orchestrator: NotificationOrchestratorService
    ) {}

    async onModuleInit() {
        this.logger.log('Initialisation des handlers...');

        // Connecte l'orchestrateur au handler
        this.notificationHandler.setOrchestrator(this.orchestrator);

        // Enregistre le handler de notifications
        this.handlerRegistry.registerHandler(this.notificationHandler);

        // Log des statistiques
        const stats = this.handlerRegistry.getStats();
        this.logger.log(`${stats.totalHandlers} handlers enregistrés pour ${stats.eventTypes.length} types d'événements`);
        this.logger.debug('Handlers par événement:', stats.handlersByEvent);
    }
}
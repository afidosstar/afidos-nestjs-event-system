import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventHandler } from '../interfaces/event-handler.interface';
import { EventHandlerContext } from '../types/handler-queue.types';
import { discoverEventHandlers, HandlerMetadata } from '../decorators/injectable-handler.decorator';
import { HandlerQueueManagerService } from './handler-queue-manager.service';
import { PackageConfig } from '../types/interfaces';
import { EVENT_NOTIFICATIONS_CONFIG } from '../module/event-notifications.module';

@Injectable()
export class EventHandlerManagerService implements OnModuleInit {
    private readonly logger = new Logger(EventHandlerManagerService.name);
    private readonly handlers = new Map<string, EventHandler[]>();
    private readonly handlerInstances = new Map<string, EventHandler>();
    private readonly handlerMetadata = new Map<string, HandlerMetadata>();

    constructor(
        @Inject(forwardRef(() => EVENT_NOTIFICATIONS_CONFIG)) private readonly config: PackageConfig,
        private readonly moduleRef: ModuleRef,
        private readonly handlerQueueManager: HandlerQueueManagerService
    ) {}

    async onModuleInit() {
        await this.discoverAndRegisterHandlers();
    }

    /**
     * Découvre et enregistre automatiquement tous les handlers
     */
    private async discoverAndRegisterHandlers() {
        const discoveredHandlers = discoverEventHandlers();
        
        for (const { class: HandlerClass, metadata } of discoveredHandlers) {
            try {
                // Récupère l'instance du handler depuis le container NestJS
                const handlerInstance = await this.moduleRef.get(HandlerClass, { strict: false });
                
                if (handlerInstance && typeof handlerInstance.execute === 'function') {
                    await this.registerHandler(handlerInstance, metadata);
                }
            } catch (error) {
                this.logger.warn(`Impossible de récupérer le handler ${metadata.name}: ${error.message}`);
            }
        }

        this.logRegistrationStats();
    }

    /**
     * Enregistre un handler et sa queue si configurée
     */
    private async registerHandler(handler: EventHandler, metadata: HandlerMetadata) {
        const handlerName = metadata.name;
        
        this.handlerInstances.set(handlerName, handler);
        this.handlerMetadata.set(handlerName, metadata);

        // Enregistre le handler pour chaque type d'événement
        for (const eventType of metadata.eventTypes) {
            if (!this.handlers.has(eventType)) {
                this.handlers.set(eventType, []);
            }
            this.handlers.get(eventType)!.push(handler);
        }

        // Trie par priorité
        this.sortHandlersByPriority();

        // Configure la queue si nécessaire
        if (metadata.queue && this.config.mode !== 'api') {
            await this.handlerQueueManager.registerHandlerQueue(handlerName, metadata.queue, handler);
        }

        this.logger.debug(`Handler '${handlerName}' enregistré pour: ${metadata.eventTypes.join(', ')}`);
    }

    /**
     * Exécute tous les handlers pour un événement donné
     */
    async executeHandlers(eventType: string, payload: any, context: EventHandlerContext): Promise<any[]> {
        const handlers = this.getHandlersForEvent(eventType);
        
        if (handlers.length === 0) {
            this.logger.debug(`Aucun handler trouvé pour l'événement: ${eventType}`);
            return [];
        }

        const results: any[] = [];

        for (const handler of handlers) {
            const handlerName = handler.getName();
            const metadata = this.handlerMetadata.get(handlerName);

            try {
                let result;

                // Détermine si le handler doit être exécuté en sync ou async
                if (metadata?.queue && metadata.queue.processing !== 'sync') {
                    // Exécution asynchrone via queue
                    const jobId = await this.handlerQueueManager.queueHandlerExecution(
                        handlerName,
                        eventType,
                        payload,
                        context
                    );

                    result = {
                        handler: handlerName,
                        status: 'queued',
                        jobId,
                        queuedAt: new Date(),
                        processing: metadata.queue.processing
                    };
                } else {
                    // Exécution synchrone directe
                    const executionResult = await handler.execute(eventType, payload, context);
                    
                    result = {
                        handler: handlerName,
                        result: executionResult,
                        status: 'completed',
                        executedAt: new Date(),
                        processing: 'sync'
                    };
                }

                results.push(result);

            } catch (error) {
                this.logger.error(`Erreur dans le handler ${handlerName}: ${error.message}`);
                results.push({
                    handler: handlerName,
                    error: error.message,
                    status: 'failed',
                    executedAt: new Date(),
                    processing: 'sync'
                });
            }
        }

        return results;
    }

    /**
     * Récupère tous les handlers pour un type d'événement
     */
    private getHandlersForEvent(eventType: string): EventHandler[] {
        const specificHandlers = this.handlers.get(eventType) || [];
        const wildcardHandlers = this.handlers.get('*') || [];
        
        return [...specificHandlers, ...wildcardHandlers];
    }

    /**
     * Trie les handlers par priorité
     */
    private sortHandlersByPriority() {
        for (const [eventType, handlers] of this.handlers.entries()) {
            handlers.sort((a, b) => {
                const priorityA = a.getPriority?.() || 0;
                const priorityB = b.getPriority?.() || 0;
                return priorityB - priorityA;
            });
        }
    }

    /**
     * Vérifie la santé de tous les handlers
     */
    async checkHandlersHealth(): Promise<Record<string, boolean>> {
        const healthStatus: Record<string, boolean> = {};

        for (const [name, handler] of this.handlerInstances.entries()) {
            try {
                healthStatus[name] = handler.isHealthy ? await handler.isHealthy() : true;
            } catch (error) {
                healthStatus[name] = false;
            }
        }

        return healthStatus;
    }

    /**
     * Statistiques complètes incluant les queues
     */
    async getStats() {
        const queueHealth = await this.handlerQueueManager.checkQueuesHealth();
        
        return {
            totalHandlers: this.handlerInstances.size,
            eventTypes: Array.from(this.handlers.keys()),
            handlersByEvent: Object.fromEntries(
                Array.from(this.handlers.entries()).map(([eventType, handlers]) => [
                    eventType,
                    handlers.map(h => h.getName())
                ])
            ),
            queuedHandlers: Array.from(this.handlerMetadata.entries())
                .filter(([_, metadata]) => metadata.queue && metadata.queue.processing !== 'sync')
                .map(([name, metadata]) => ({
                    name,
                    processing: metadata.queue?.processing,
                    priority: metadata.queue?.priority,
                    healthy: queueHealth[name] || false
                })),
            queuesHealth: queueHealth
        };
    }

    private logRegistrationStats() {
        const stats = {
            totalHandlers: this.handlerInstances.size,
            eventTypes: Array.from(this.handlers.keys()).length,
            queuedHandlers: Array.from(this.handlerMetadata.values())
                .filter(metadata => metadata.queue && metadata.queue.processing !== 'sync').length
        };
        
        this.logger.log(
            `${stats.totalHandlers} handlers enregistrés pour ${stats.eventTypes} types d'événements ` +
            `(${stats.queuedHandlers} avec queues)`
        );
    }
}
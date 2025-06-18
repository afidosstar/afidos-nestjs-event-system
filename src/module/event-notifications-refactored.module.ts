import { DynamicModule, Module } from '@nestjs/common';
import {
    EventPayloads,
    PackageConfig
} from '../types/interfaces';

// Services refactorisés
import { EventBusService } from '../services/event-bus.service';
import { EventEmitterService } from '../services/event-emitter-refactored.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { NotificationProcessorService } from '../services/notification-processor.service';
import { EventHandlerRegistryService } from '../services/event-handler-registry.service';
import { HandlerInitializerService } from '../services/handler-initializer.service';

// Handlers
import { NotificationEventHandler } from '../handlers/notification-event.handler';

/**
 * Configuration tokens pour l'injection de dépendances
 */
export const EVENT_NOTIFICATIONS_CONFIG = 'EVENT_NOTIFICATIONS_CONFIG';
export const EVENT_TYPES_CONFIG = 'EVENT_TYPES_CONFIG';
export const PROVIDERS_CONFIG = 'PROVIDERS_CONFIG';

/**
 * Module EventNotifications refactorisé sans dépendances circulaires
 * Utilise un EventBus pour découpler les communications
 */
@Module({})
export class EventNotificationsRefactoredModule {
    /**
     * Configuration principale
     */
    static forRoot<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsRefactoredModule,
            providers: [
                // Configuration tokens
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config,
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes,
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useValue: config.providers || {},
                },
                
                // Services découplés avec pattern Publisher/Subscriber/Handler
                EventHandlerRegistryService,        // Registry des handlers (base service, no dependencies)
                EventBusService,                    // Bus d'événements (Publisher/Subscriber)
                NotificationOrchestratorService,    // Orchestrateur (needs config)
                NotificationEventHandler,           // Handler pour les notifications (no dependencies now)
                HandlerInitializerService,          // Initialise les handlers (needs registry & handler)
                EventEmitterService,                // Emitter (Publisher)
            ],
            exports: [
                EventEmitterService,
                EventBusService,
                NotificationOrchestratorService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }

    /**
     * Configuration asynchrone
     */
    static forRootAsync<T extends EventPayloads = EventPayloads>(options: {
        useFactory: (...args: any[]) => Promise<PackageConfig<T>> | PackageConfig<T>;
        inject?: any[];
    }): DynamicModule {
        return {
            module: EventNotificationsRefactoredModule,
            providers: [
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return config.eventTypes;
                    },
                    inject: options.inject || [],
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return config.providers || {};
                    },
                    inject: options.inject || [],
                },
                EventBusService,
                NotificationOrchestratorService,
                EventEmitterService,
            ],
            exports: [
                EventEmitterService,
                EventBusService,
                NotificationOrchestratorService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }
}
import { DynamicModule, Module } from '@nestjs/common';
import {
    EventPayloads,
    PackageConfig,
    NotificationProviderConfig,
    QueueConfig
} from '../types/interfaces';

// Services
import { EventEmitterService } from '../services/event-emitter.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { QueueManagerService } from '../services/queue-manager.service';

/**
 * Configuration tokens pour l'injection de dépendances
 */
export const EVENT_NOTIFICATIONS_CONFIG = 'EVENT_NOTIFICATIONS_CONFIG';
export const EVENT_TYPES_CONFIG = 'EVENT_TYPES_CONFIG';
export const PROVIDERS_CONFIG = 'PROVIDERS_CONFIG';

/**
 * Module principal pour les notifications d'événements
 * Architecture simplifiée avec drivers pré-configurés
 */
@Module({})
export class EventNotificationsModule {
    /**
     * Configuration statique
     */
    static forRoot<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            providers: [
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
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
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
            module: EventNotificationsModule,
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
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }

    /**
     * Configuration pour workers (mode worker uniquement)
     */
    static forWorker<T extends EventPayloads = EventPayloads>(
        config: {
            eventTypes: PackageConfig<T>['eventTypes'];
            providers: Record<string, NotificationProviderConfig>;
            queue?: QueueConfig;
        }
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            providers: [
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes,
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useValue: config.providers,
                },
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }
}
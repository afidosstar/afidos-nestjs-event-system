import { DynamicModule, Module, forwardRef } from '@nestjs/common';
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
import { HandlerQueueManagerService } from '../services/handler-queue-manager.service';
import { EventHandlerManagerService } from '../services/event-handler-manager.service';

// Modules
import { DriversModule } from './drivers.module';

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
        // Valider la configuration des drivers
        const driverValidation = DriversModule.validateDriversConfig(config);
        if (!driverValidation.valid) {
            throw new Error(`Invalid drivers configuration: ${driverValidation.errors.join(', ')}`);
        }

        return {
            module: EventNotificationsModule,
            imports: [
                DriversModule.forRoot(config)
            ],
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
                {
                    provide: NotificationOrchestratorService,
                    useClass: NotificationOrchestratorService,
                },
                {
                    provide: QueueManagerService,
                    useClass: QueueManagerService,
                },
                {
                    provide: HandlerQueueManagerService,
                    useClass: HandlerQueueManagerService,
                },
                {
                    provide: EventHandlerManagerService,
                    useClass: EventHandlerManagerService,
                },
                {
                    provide: EventEmitterService,
                    useClass: EventEmitterService,
                },
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
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
            imports: [
                DriversModule.forRootAsync({
                    useFactory: options.useFactory,
                    inject: options.inject || []
                })
            ],
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
                {
                    provide: NotificationOrchestratorService,
                    useClass: NotificationOrchestratorService,
                },
                {
                    provide: QueueManagerService,
                    useClass: QueueManagerService,
                },
                {
                    provide: HandlerQueueManagerService,
                    useClass: HandlerQueueManagerService,
                },
                {
                    provide: EventHandlerManagerService,
                    useClass: EventHandlerManagerService,
                },
                {
                    provide: EventEmitterService,
                    useClass: EventEmitterService,
                },
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
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
        config: PackageConfig<T>
    ): DynamicModule {
        // Valider la configuration des drivers
        const driverValidation = DriversModule.validateDriversConfig(config);
        if (!driverValidation.valid) {
            throw new Error(`Invalid drivers configuration: ${driverValidation.errors.join(', ')}`);
        }

        return {
            module: EventNotificationsModule,
            imports: [
                DriversModule.forWorker(config)
            ],
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
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }

    /**
     * Configuration pour mode API uniquement (pas de queues)
     */
    static forApi<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        // Valider la configuration des drivers
        const driverValidation = DriversModule.validateDriversConfig(config);
        if (!driverValidation.valid) {
            throw new Error(`Invalid drivers configuration: ${driverValidation.errors.join(', ')}`);
        }

        return {
            module: EventNotificationsModule,
            imports: [
                DriversModule.forApi(config)
            ],
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
                EventHandlerManagerService,
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                EventHandlerManagerService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }
}

import { DynamicModule, Module } from '@nestjs/common';
import {
    EventPayloads,
    PackageConfig
} from '../types/interfaces';

// Services simplifiés
import { EventEmitterSimpleService } from '../services/event-emitter-simple.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';

/**
 * Configuration tokens pour l'injection de dépendances
 */
export const EVENT_NOTIFICATIONS_CONFIG = 'EVENT_NOTIFICATIONS_CONFIG';
export const EVENT_TYPES_CONFIG = 'EVENT_TYPES_CONFIG';
export const PROVIDERS_CONFIG = 'PROVIDERS_CONFIG';

/**
 * Module EventNotifications simplifié sans dépendances circulaires
 * Utilise un émetteur direct intégré avec l'orchestrateur
 */
@Module({})
export class EventNotificationsSimpleModule {
    /**
     * Configuration principale
     */
    static forRoot<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsSimpleModule,
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
                
                // Services sans dépendances circulaires
                NotificationOrchestratorService,    // Service de base
                EventEmitterSimpleService,          // Émetteur simplifié
            ],
            exports: [
                EventEmitterSimpleService,
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
            module: EventNotificationsSimpleModule,
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
                NotificationOrchestratorService,
                EventEmitterSimpleService,
            ],
            exports: [
                EventEmitterSimpleService,
                NotificationOrchestratorService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
                PROVIDERS_CONFIG
            ],
            global: true
        };
    }
}
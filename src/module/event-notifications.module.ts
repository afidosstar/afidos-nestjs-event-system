import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import {
    EventPayloads,
    PackageConfig,
    NotificationProviderConfig,
    QueueConfig
} from '../types/interfaces';

// Services
import { EventEmitterService } from '../services/event-emitter.service';
import { EventRoutingService } from '../services/event-routing.service';
import { QueueService } from '../services/queue.service';
import { RetryService } from '../services/retry.service';

// Providers
import { SmtpEmailProvider, SmtpConfig } from '../providers/email/smtp-email.provider';
import { HttpWebhookProvider, WebhookConfig } from '../providers/webhook/http-webhook.provider';
import { ExternalServiceProvider, ExternalServiceConfig } from '../providers/external-service/firebase-like.provider';

// Entities (à créer)
import { EventLogEntity, EventTypeEntity } from '../entities';
import {Repository} from "typeorm";

/**
 * Configuration tokens pour l'injection de dépendances
 */
export const EVENT_NOTIFICATIONS_CONFIG = 'EVENT_NOTIFICATIONS_CONFIG';
export const EVENT_TYPES_CONFIG = 'EVENT_TYPES_CONFIG';
export const PROVIDERS_CONFIG = 'PROVIDERS_CONFIG';

/**
 * Module principal pour le système d'événements et notifications
 */
@Global()
@Module({})
export class EventNotificationsModule {
    /**
     * Configuration synchrone du module
     */
    static forRoot<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: [
                // TypeORM pour les entités
                // TypeOrmModule.forFeature([
                //     EventTypeEntity,
                //     EventLogEntity
                // ]),

                // Bull pour les queues (optionnel)
                ...(config.queue ? [
                    BullModule.forRoot({
                        redis: config.queue.redis,
                        prefix: config.queue.prefix || 'notifications'
                    }),
                    BullModule.registerQueue({
                        name: 'notifications',
                        defaultJobOptions: config.queue.defaultJobOptions || {
                            attempts: 3,
                            delay: 1000,
                            removeOnComplete: 100,
                            removeOnFail: 50
                        }
                    })
                ] : [])
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useValue: config.providers
                },

                // Core services
                RetryService,
                {
                    provide: EventRoutingService,
                    useFactory(retryService: RetryService){
                        return new EventRoutingService(config.eventTypes,retryService);
                    },
                    inject: [RetryService]
                },
                //EventRoutingService,
                {
                    provide: EventEmitterService,
                    useFactory(eventRoutingService: EventRoutingService,queueService:QueueService){
                        return new EventEmitterService(config.eventTypes,eventRoutingService,queueService);
                    },
                    inject: [EventRoutingService,QueueService]
                },
                QueueService,
                //EventEmitterService,

                // Dynamic providers based on configuration
                ...this.createNotificationProviders(config.providers)
            ],
            exports: [
                EventEmitterService,
                EventRoutingService,
                QueueService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ],
        };
    }

    /**
     * Configuration asynchrone du module
     */
    static forRootAsync<T extends EventPayloads = EventPayloads>(options: {
        imports?: any[];
        inject?: any[];
        useFactory: (...args: any[]) => Promise<PackageConfig<T>> | PackageConfig<T>;
    }): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: [
                ...(options.imports || []),
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ])
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useFactory: options.useFactory,
                    inject: options.inject || []
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return config.eventTypes;
                    },
                    inject: options.inject || []
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return config.providers;
                    },
                    inject: options.inject || []
                },

                // Core services
                RetryService,
                EventRoutingService,
                QueueService,
                EventEmitterService,

                // Dynamic providers factory
                {
                    provide: 'NOTIFICATION_PROVIDERS_FACTORY',
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        return this.createNotificationProviders(config.providers);
                    },
                    inject: options.inject || []
                }
            ],
            exports: [
                EventEmitterService,
                EventRoutingService,
                QueueService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ]
        };
    }

    /**
     * Créer les providers de notification dynamiquement
     */
    private static createNotificationProviders(
        providersConfig: Record<string, NotificationProviderConfig>
    ): Provider[] {
        const providers: Provider[] = [];

        for (const [channelName, providerConfig] of Object.entries(providersConfig)) {
            if (!providerConfig.enabled && providerConfig.enabled !== undefined) {
                continue; // Skip disabled providers
            }

            const providerToken = `${channelName.toUpperCase()}_PROVIDER`;

            switch (providerConfig.driver) {
                case 'smtp':
                    providers.push({
                        provide: providerToken,
                        useFactory: (routingService: EventRoutingService) => {
                            const provider = new SmtpEmailProvider(providerConfig.config as SmtpConfig);

                            // Valider la configuration
                            const validation = provider.validateConfig(providerConfig.config as SmtpConfig);
                            if (validation !== true) {
                                throw new Error(`Invalid SMTP configuration for ${channelName}: ${(validation as string[]).join(', ')}`);
                            }

                            // Enregistrer le provider
                            routingService.registerProvider(provider);
                            return provider;
                        },
                        inject: [EventRoutingService]
                    });
                    break;

                case 'http':
                case 'webhook':
                    providers.push({
                        provide: providerToken,
                        useFactory: (routingService: EventRoutingService) => {
                            const provider = new HttpWebhookProvider(providerConfig.config as WebhookConfig);

                            // Valider la configuration
                            const validation = provider.validateConfig(providerConfig.config as WebhookConfig);
                            if (validation !== true) {
                                throw new Error(`Invalid webhook configuration for ${channelName}: ${(validation as string[]).join(', ')}`);
                            }

                            // Enregistrer le provider
                            routingService.registerProvider(provider);
                            return provider;
                        },
                        inject: [EventRoutingService]
                    });
                    break;

                case 'firebase-like':
                case 'external-service':
                    providers.push({
                        provide: providerToken,
                        useFactory: (routingService: EventRoutingService) => {
                            const provider = new ExternalServiceProvider(providerConfig.config as ExternalServiceConfig);

                            // Valider la configuration
                            const validation = provider.validateConfig(providerConfig.config as ExternalServiceConfig);
                            if (validation !== true) {
                                throw new Error(`Invalid external service configuration for ${channelName}: ${(validation as string[]).join(', ')}`);
                            }

                            // Enregistrer le provider
                            routingService.registerProvider(provider);
                            return provider;
                        },
                        inject: [EventRoutingService]
                    });
                    break;

                default:
                    throw new Error(`Unsupported provider driver: ${providerConfig.driver} for channel: ${channelName}`);
            }
        }

        return providers;
    }

    /**
     * Créer un module worker uniquement (pour les instances worker dédiées)
     */
    static forWorker<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        if (!config.queue) {
            throw new Error('Queue configuration is required for worker mode');
        }

        return {
            module: EventNotificationsModule,
            imports: [
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ]),
                BullModule.forRoot({
                    redis: config.queue.redis,
                    prefix: config.queue.prefix || 'notifications'
                }),
                BullModule.registerQueue({
                    name: 'notifications',
                    defaultJobOptions: config.queue.defaultJobOptions || {
                        attempts: 3,
                        delay: 1000,
                        removeOnComplete: 100,
                        removeOnFail: 50
                    }
                })
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes
                },
                {
                    provide: PROVIDERS_CONFIG,
                    useValue: config.providers
                },

                // Services nécessaires pour le worker
                RetryService,
                EventRoutingService,
                QueueService,

                // Providers de notification
                ...this.createNotificationProviders(config.providers)
            ],
            exports: [
                QueueService,
                EventRoutingService
            ]
        };
    }

    /**
     * Créer un module API uniquement (sans workers)
     */
    static forApi<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: [
                TypeOrmModule.forFeature([
                    EventTypeEntity,
                    EventLogEntity
                ]),

                // Queue pour l'émission uniquement (pas de workers)
                ...(config.queue ? [
                    BullModule.forRoot({
                        redis: config.queue.redis,
                        prefix: config.queue.prefix || 'notifications'
                    }),
                    BullModule.registerQueue({
                        name: 'notifications'
                    })
                ] : [])
            ],
            providers: [
                // Configuration providers
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: config
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: config.eventTypes
                },

                // Services pour l'API (pas de routing complet)
                RetryService,
                EventEmitterService,
                ...(config.queue ? [QueueService] : [])
            ],
            exports: [
                EventEmitterService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ]
        };
    }
}

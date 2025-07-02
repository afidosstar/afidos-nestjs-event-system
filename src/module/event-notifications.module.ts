import {DynamicModule, Module, forwardRef, Logger, Provider} from '@nestjs/common';
import {
    EventPayloads, NotificationModuleAsyncOptions, NotificationModuleOptions, NotificationModuleOptionsWithoutMode,
    PackageConfig,
} from '../types/interfaces';

// Services
import { EventEmitterService } from '../services/event-emitter.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { QueueManagerService } from '../services/queue-manager.service';
import { HandlerQueueManagerService } from '../services/handler-queue-manager.service';
import { EventHandlerManagerService } from '../services/event-handler-manager.service';
import { QueueProvider } from '../types/interfaces';


/**
 * Configuration tokens pour l'injection de dépendances (Symboles)
 */
export const EVENT_NOTIFICATIONS_CONFIG = Symbol('EVENT_NOTIFICATIONS_CONFIG');
export const EVENT_TYPES_CONFIG = Symbol('EVENT_TYPES_CONFIG');
export const PROVIDERS_CONFIG = Symbol('PROVIDERS_CONFIG');
export const QUEUE_PROVIDER_TOKEN = Symbol('QUEUE_PROVIDER_TOKEN');
export const RECIPIENT_LOADER_TOKEN = Symbol('RECIPIENT_LOADER_TOKEN');

/**
 * Factory pour créer le QueueProvider selon la configuration
 * Utilise un simple File Queue Provider basé sur le système de fichiers
 */
async function createQueueProvider(config: PackageConfig): Promise<QueueProvider | null> {
    if (!config.queue) {
        return null;
    }

    const logger = new Logger('QueueProviderFactory');

    try {
        // Importer dynamiquement le FileQueueProvider
        const { FileQueueProvider } = await import('../queue/file-queue.provider');

        // Configuration du répertoire de données
        const queueName = config.queue.prefix || 'notifications';
        const dataDir = process.env.QUEUE_DATA_DIR || './queue-data';

        // Créer le provider de fichier
        const fileQueueProvider = FileQueueProvider.create(queueName, dataDir);

        logger.log(`📁 File Queue Provider created: ${queueName} in ${dataDir}`);

        return fileQueueProvider;

    } catch (error) {
        logger.error(`Failed to create File Queue Provider: ${error.message}`);

        // Fallback vers un mock simple en cas d'erreur
        logger.warn('Falling back to mock queue provider');
        return {
            async add(jobName: string, data: any, options?: any): Promise<any> {
                logger.log(`Mock Queue: Job ${jobName} ajouté`);
                return { id: `mock-job-${Date.now()}` };
            },

            async process(jobName: string, processorOrConcurrency: number | ((job: any) => Promise<any>), processor?: (job: any) => Promise<any>): Promise<void> {
                logger.log(`Mock Queue: Processor enregistré pour ${jobName}`);
            },

            async isHealthy(): Promise<boolean> {
                return true;
            },

            async close(): Promise<void> {
                logger.log('Mock Queue: Fermée');
            }
        };
    }
}

/**
 * Factory pour créer un mock RecipientLoader avec avertissement
 */
function createMockRecipientLoader(): any {
    const logger = new Logger('RecipientLoaderFactory');

    logger.warn(
        '⚠️ AVERTISSEMENT: Aucun RECIPIENT_LOADER_TOKEN configuré dans les providers. ' +
        'Un mock est utilisé qui retournera une liste vide. ' +
        'Configurez un RecipientLoader réel dans votre module pour recevoir des notifications.'
    );

    return {
        async load(eventType: string, payload: any): Promise<any[]> {
            logger.warn(
                `Mock RecipientLoader: Aucun destinataire trouvé pour l'événement ${eventType}. ` +
                'Configurez un vrai RecipientLoader pour recevoir des notifications.'
            );
            return [];
        }
    };
}

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
        options: NotificationModuleOptions
    ): DynamicModule {
        return {
            module: EventNotificationsModule,
            providers: [
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useValue: options.config,
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useValue: options.config.eventTypes,
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
                ...(options.queueProvider ?
                        [{provide: QUEUE_PROVIDER_TOKEN,useClass: options.queueProvider}] :
                    [{
                        provide: QUEUE_PROVIDER_TOKEN,
                        useFactory: async (config: PackageConfig) => createQueueProvider(config),
                        inject: [EVENT_NOTIFICATIONS_CONFIG],
                    }]
                ),

                ...(options.recipientLoader ?
                        [{provide: RECIPIENT_LOADER_TOKEN, useClass: options.recipientLoader}]:
                        [{ provide: RECIPIENT_LOADER_TOKEN, useFactory: () =>  createMockRecipientLoader()}]
                )
            ],
            imports: options.imports,
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG
            ],
            global: true
        };
    }

    /**
     * Configuration asynchrone
     */
    static forRootAsync<T extends EventPayloads = EventPayloads>(options: NotificationModuleAsyncOptions): DynamicModule {
        return {
            module: EventNotificationsModule,
            imports: options.imports,
            providers: [
                {
                    provide: EVENT_NOTIFICATIONS_CONFIG,
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        config.mode = options.mode ?? 'hybrid';
                        return config;
                    },
                    inject: options.inject || [],
                },
                {
                    provide: EVENT_TYPES_CONFIG,
                    useFactory: (config) => {
                        return config.eventTypes;
                    },
                    inject: [EVENT_NOTIFICATIONS_CONFIG],
                },
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
                ...(options.queueProvider ?
                        [{provide: QUEUE_PROVIDER_TOKEN,useClass: options.queueProvider}] :
                        [{
                            provide: QUEUE_PROVIDER_TOKEN,
                            useFactory: async (config: PackageConfig) => createQueueProvider(config),
                            inject: [EVENT_NOTIFICATIONS_CONFIG],
                        }]
                ),

                ...(options.recipientLoader ?
                        [{provide: RECIPIENT_LOADER_TOKEN, useClass: options.recipientLoader}]:
                        [{ provide: RECIPIENT_LOADER_TOKEN, useFactory: () =>  createMockRecipientLoader()}]
                )
            ],
            exports: [
                EventEmitterService,
                NotificationOrchestratorService,
                QueueManagerService,
                HandlerQueueManagerService,
                EventHandlerManagerService,
                EVENT_NOTIFICATIONS_CONFIG,
                EVENT_TYPES_CONFIG,
            ],
            global: options.isGlobal ?? true
        };
    }

    /**
     * Configuration pour workers (mode worker uniquement)
     */
    static forWorker<T extends EventPayloads = EventPayloads>(options: NotificationModuleOptionsWithoutMode): DynamicModule {
        (options.config as PackageConfig<T>).mode = 'worker';
        return this.forRoot(options as NotificationModuleOptions);
    }

    /**
     * Configuration pour mode API uniquement (pas de queues)
     */
    static forApi<T extends EventPayloads = EventPayloads>(options: NotificationModuleOptionsWithoutMode): DynamicModule {
        (options.config as PackageConfig<T>).mode = 'api';
        return this.forRoot(options as NotificationModuleOptions);
    }

    /**
     * Configuration asynchrone pour mode Worker uniquement
     */
    static forWorkerAsync<T extends EventPayloads = EventPayloads>(options: NotificationModuleAsyncOptions): DynamicModule {
        return this.forRootAsync(options);
    }

    /**
     * Configuration asynchrone pour mode API uniquement
     */
    static forApiAsync<T extends EventPayloads = EventPayloads>(options: NotificationModuleAsyncOptions): DynamicModule {
        return this.forRootAsync(options)
    }
}

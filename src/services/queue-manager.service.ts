import { Injectable, Inject, Logger, Optional, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
    QueueConfig,
    QueuedEvent,
    EventEmissionResult,
    NotificationContext,
    EmitOptions,
    PackageConfig
} from '../types/interfaces';
import { NotificationOrchestratorService } from './notification-orchestrator.service';
import { EVENT_NOTIFICATIONS_CONFIG } from '../module/event-notifications.module';

export interface QueueProvider {
    add(jobName: string, data: any, options?: any): Promise<any>;
    process(jobName: string, processorOrConcurrency: number | ((job: any) => Promise<any>), processor?: (job: any) => Promise<any>): Promise<void>;
    isHealthy(): Promise<boolean>;
    close(): Promise<void>;
    getStats?(): Promise<any>;
}

/**
 * Service de gestion de la queue avec support des différents modes
 *
 * Modes supportés :
 * - 'api' : Traitement immédiat uniquement, pas de queue
 * - 'worker' : Queue obligatoire, traitement différé uniquement
 * - 'hybrid' : Traitement immédiat + queue pour cas spécifiques
 */
@Injectable()
export class QueueManagerService {
    private readonly logger = new Logger(QueueManagerService.name);
    private queueProvider?: QueueProvider;
    private readonly mode: 'api' | 'worker' | 'hybrid';
    private readonly queueConfig?: QueueConfig;

    constructor(
        @Inject(forwardRef(() => EVENT_NOTIFICATIONS_CONFIG)) private readonly config: PackageConfig,
        @Inject(forwardRef(() => NotificationOrchestratorService)) private readonly orchestrator: NotificationOrchestratorService,
        private readonly moduleRef: ModuleRef
    ) {
        this.mode = this.config.mode || 'api';
        this.queueConfig = this.config.queue;

        this.validateConfiguration();
        this.initializeQueue();
    }

    /**
     * Valide la configuration selon le mode choisi
     */
    private validateConfiguration(): void {
        // Mode worker nécessite absolument une queue
        if (this.mode === 'worker' && !this.queueConfig) {
            throw new Error(
                `Mode 'worker' nécessite une configuration de queue. ` +
                `Ajoutez une section 'queue' dans votre configuration.`
            );
        }

        // Mode worker nécessite un orchestrateur
        if (this.mode === 'worker' && !this.orchestrator) {
            throw new Error(
                `Mode 'worker' nécessite le NotificationOrchestratorService. ` +
                `Assurez-vous qu'il est bien configuré dans le module.`
            );
        }

        this.logger.log(`Mode de fonctionnement : ${this.mode}`);
        if (this.queueConfig) {
            this.logger.log(`Queue configurée : Redis ${this.queueConfig.redis.host}:${this.queueConfig.redis.port}`);
        }
    }

    /**
     * Initialise la queue si configurée
     */
    private async initializeQueue(): Promise<void> {
        if (!this.queueConfig) {
            this.logger.log('Aucune queue configurée - mode direct uniquement');
            return;
        }

        try {
            // Ici on pourrait utiliser Bull, BullMQ, ou autre
            // Pour l'exemple, on simule une queue provider
            this.queueProvider = await this.createQueueProvider();

            // En mode worker, on démarre le traitement des jobs
            if (this.mode === 'worker') {
                await this.startWorkerMode();
            }

            this.logger.log('Queue initialisée avec succès');

        } catch (error) {
            this.logger.error(`Erreur lors de l'initialisation de la queue: ${error.message}`);

            // En mode worker, c'est fatal
            if (this.mode === 'worker') {
                throw error;
            }

            // En mode hybrid, on continue sans queue
            this.logger.warn('Fonctionnement en mode direct sans queue');
        }
    }

    /**
     * Traite un événement selon le mode et la configuration
     */
    async processEvent(
        eventType: string,
        payload: any,
        context: NotificationContext,
        options: EmitOptions = {}
    ): Promise<EventEmissionResult> {
        const startTime = Date.now();

        // Détermine le mode de traitement
        const processingMode = this.determineProcessingMode(eventType, options);

        this.logger.debug(
            `Traitement événement ${eventType} en mode ${processingMode} ` +
            `(mode global: ${this.mode})`
        );

        switch (processingMode) {
            case 'immediate':
                return await this.processImmediate(eventType, payload, context, startTime);

            case 'queued':
                return await this.processQueued(eventType, payload, context, options, startTime);

            default:
                throw new Error(`Mode de traitement non supporté: ${processingMode}`);
        }
    }

    /**
     * Détermine le mode de traitement selon la configuration
     */
    private determineProcessingMode(eventType: string, options: EmitOptions): 'immediate' | 'queued' {
        // 1. Mode worker → toujours en queue
        if (this.mode === 'worker') {
            return 'queued';
        }

        // 2. Mode API → toujours immédiat
        if (this.mode === 'api') {
            return 'immediate';
        }

        // 3. Mode hybrid → selon les options et la config de l'événement
        if (this.mode === 'hybrid') {
            // Force dans les options
            if (options.mode === 'sync') return 'immediate';
            if (options.mode === 'async') return this.queueProvider ? 'queued' : 'immediate';

            // Configuration de l'événement
            const eventConfig = (this.config.eventTypes as any)[eventType];
            if (eventConfig?.defaultProcessing === 'sync') return 'immediate';
            if (eventConfig?.defaultProcessing === 'async') {
                return this.queueProvider ? 'queued' : 'immediate';
            }

            // Par défaut en hybrid : queue si disponible
            return this.queueProvider ? 'queued' : 'immediate';
        }

        return 'immediate';
    }

    /**
     * Traitement immédiat via l'orchestrateur
     */
    private async processImmediate(
        eventType: string,
        payload: any,
        context: NotificationContext,
        startTime: number
    ): Promise<EventEmissionResult> {
        if (!this.orchestrator) {
            throw new Error('NotificationOrchestratorService requis pour le traitement immédiat');
        }

        const results = await this.orchestrator.processEvent(eventType, payload, context);
        const processingDuration = Date.now() - startTime;

        return {
            eventId: context.eventId,
            correlationId: context.correlationId,
            mode: 'sync',
            waitedForResult: true,
            results,
            processedAt: new Date(),
            processingDuration
        };
    }

    /**
     * Traitement différé via la queue
     */
    private async processQueued(
        eventType: string,
        payload: any,
        context: NotificationContext,
        options: EmitOptions,
        startTime: number
    ): Promise<EventEmissionResult> {
        if (!this.queueProvider) {
            throw new Error('Queue provider requis pour le traitement différé');
        }

        const queuedEvent: QueuedEvent = {
            eventId: context.eventId,
            eventType,
            payload,
            correlationId: context.correlationId,
            options,
            attempt: context.attempt,
            createdAt: new Date()
        };

        // Options de la queue selon la config de l'événement
        const eventConfig = (this.config.eventTypes as any)[eventType];
        const queueOptions = {
            delay: options.delay || eventConfig?.delay || 0,
            attempts: options.retryAttempts || eventConfig?.retryAttempts || this.queueConfig?.defaultJobOptions?.attempts || 3,
            priority: this.getPriority(eventConfig?.priority),
            ...this.queueConfig?.defaultJobOptions
        };

        await this.queueProvider.add('process-notification', queuedEvent, queueOptions);

        const processingDuration = Date.now() - startTime;

        this.logger.log(`Événement ${eventType} mis en queue avec délai ${queueOptions.delay}ms`);

        return {
            eventId: context.eventId,
            correlationId: context.correlationId,
            mode: 'async',
            waitedForResult: false,
            queuedAt: new Date(startTime),
            processingDuration,
            metadata: {
                queueOptions,
                queueMode: true
            }
        };
    }

    /**
     * Démarre le mode worker pour traiter les jobs de la queue
     */
    private async startWorkerMode(): Promise<void> {
        if (!this.queueProvider || !this.orchestrator) {
            throw new Error('Queue provider et orchestrateur requis en mode worker');
        }

        this.logger.log('Démarrage du mode worker...');

        await this.queueProvider.process('process-notification', async (job: any) => {
            const queuedEvent: QueuedEvent = job.data;

            this.logger.debug(`Traitement job ${job.id} pour événement ${queuedEvent.eventType}`);

            const context: NotificationContext = {
                eventId: queuedEvent.eventId,
                correlationId: queuedEvent.correlationId,
                eventType: queuedEvent.eventType,
                attempt: queuedEvent.attempt || 1,
                metadata: {
                    jobId: job.id,
                    processedFromQueue: true
                }
            };

            return await this.orchestrator.processEvent(
                queuedEvent.eventType,
                queuedEvent.payload,
                context
            );
        });

        this.logger.log('Mode worker démarré - traitement des jobs en cours');
    }

    /**
     * Convertit la priorité en valeur numérique pour la queue
     */
    private getPriority(priority?: string): number {
        const priorityMap = {
            'low': 1,
            'normal': 5,
            'high': 10,
            'critical': 20
        };
        return priorityMap[priority as keyof typeof priorityMap] || 5;
    }

    /**
     * Crée le provider de queue (Bull, BullMQ, etc.)
     */
    private async createQueueProvider(): Promise<QueueProvider> {
        // Ici on pourrait intégrer avec Bull/BullMQ
        // Pour l'exemple, on retourne un mock
        return {
            async add(jobName: string, _data: any, _options?: any): Promise<any> {
                this.logger.debug(`Mock: Job ${jobName} ajouté à la queue`);
                return { id: `job-${Date.now()}` };
            },

            async process(jobName: string, processorOrConcurrency: number | ((job: any) => Promise<any>), processor?: (job: any) => Promise<any>): Promise<void> {
                this.logger.debug(`Mock: Processor enregistré pour ${jobName}`);
            },

            async isHealthy(): Promise<boolean> {
                return true;
            },

            async close(): Promise<void> {
                this.logger.log('Queue fermée');
            }
        };
    }

    /**
     * Vérifie la santé de la queue
     */
    async healthCheck(): Promise<{ queue: boolean, mode: string }> {
        const queueHealth = this.queueProvider ? await this.queueProvider.isHealthy() : false;

        return {
            queue: queueHealth,
            mode: this.mode
        };
    }

    /**
     * Crée une queue personnalisée pour un handler
     */
    async createQueue(queueName: string, options: any = {}): Promise<QueueProvider> {
        // Utilise la même logique que la queue principale mais avec des options personnalisées
        return {
            async add(jobName: string, data: any, jobOptions?: any): Promise<any> {
                this.logger.debug(`Queue ${queueName}: Job ${jobName} ajouté`);
                return { id: `${queueName}-job-${Date.now()}` };
            },

            async process(jobName: string, processorOrConcurrency: number | ((job: any) => Promise<any>), processor?: (job: any) => Promise<any>): Promise<void> {
                if (typeof processorOrConcurrency === 'function') {
                    // process(jobName, processor)
                    this.logger.debug(`Queue ${queueName}: Processor enregistré pour ${jobName}`);
                } else {
                    // process(jobName, concurrency, processor)
                    const concurrency = processorOrConcurrency;
                    this.logger.debug(`Queue ${queueName}: Processor enregistré pour ${jobName} avec concurrence ${concurrency}`);
                }
            },

            async isHealthy(): Promise<boolean> {
                return true;
            },

            async close(): Promise<void> {
                this.logger.log(`Queue ${queueName} fermée`);
            },

            async getStats(): Promise<any> {
                return {
                    name: queueName,
                    waiting: 0,
                    active: 0,
                    completed: 0,
                    failed: 0
                };
            }
        };
    }

    /**
     * Ferme proprement la queue
     */
    async shutdown(): Promise<void> {
        if (this.queueProvider) {
            await this.queueProvider.close();
            this.logger.log('Queue fermée proprement');
        }
    }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventHandler } from '../interfaces/event-handler.interface';
import { HandlerQueueConfig, QueuedHandlerJob, EventHandlerContext } from '../types/handler-queue.types';
import { QueueManagerService, QueueProvider } from './queue-manager.service';
import { EVENT_NOTIFICATIONS_CONFIG } from '../module/event-notifications.module';
import { PackageConfig } from '../types/interfaces';

@Injectable()
export class HandlerQueueManagerService implements OnModuleInit, OnModuleDestroy {
    protected readonly logger = new Logger(HandlerQueueManagerService.name);
    private readonly handlerQueues = new Map<string, QueueProvider>();
    private readonly queueConfigs = new Map<string, HandlerQueueConfig>();

    constructor(
        @Inject(forwardRef(() => EVENT_NOTIFICATIONS_CONFIG)) private readonly config: PackageConfig,
        @Inject(forwardRef(() => QueueManagerService)) private readonly queueManager: QueueManagerService,
        private readonly moduleRef: ModuleRef
    ) {}

    async onModuleInit() {
        if (this.config.mode !== 'api') {
            await this.initializeHandlerQueues();
        }
    }

    async onModuleDestroy() {
        await this.closeAllQueues();
    }

    /**
     * Initialise les queues spécifiques aux handlers
     */
    private async initializeHandlerQueues() {
        // Cette méthode sera appelée par le HandlerManagerService
        // pour chaque handler découvert avec une configuration de queue
        this.logger.log('Initialisation des queues de handlers...');
    }

    /**
     * Enregistre une queue pour un handler spécifique
     */
    async registerHandlerQueue(handlerName: string, config: HandlerQueueConfig, handler: EventHandler) {
        const queueName = config.name || `handler-${handlerName}`;

        try {
            // Utilise le QueueManagerService existant pour créer la queue
            const queueProvider = await this.queueManager.createQueue(queueName, {
                defaultJobOptions: {
                    priority: config.priority || 0,
                    delay: config.delay?.ms || 0,
                    attempts: config.retry?.attempts || 1,
                    backoff: config.retry?.backoff || { type: 'fixed', delay: 1000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                    timeout: config.timeout || 30000
                },
                settings: {
                    stalledInterval: 30000,
                    maxStalledCount: 1
                },
                redis: {
                    keyPrefix: config.redis?.keyPrefix || `handler:${handlerName}:`,
                    jobTTL: config.redis?.jobTTL || 3600
                }
            });

            // Configure le processor pour ce handler
            await queueProvider.process(
                queueName,
                config.concurrency || 1,
                async (job) => await this.processHandlerJob(job, handler, config)
            );

            this.handlerQueues.set(handlerName, queueProvider);
            this.queueConfigs.set(handlerName, config);

            this.logger.log(`Queue '${queueName}' initialisée pour le handler '${handlerName}'`);
        } catch (error) {
            this.logger.error(`Erreur lors de l'initialisation de la queue pour ${handlerName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ajoute un job à la queue d'un handler
     */
    async queueHandlerExecution(
        handlerName: string,
        eventType: string,
        payload: any,
        context: EventHandlerContext
    ): Promise<string> {
        const queueProvider = this.handlerQueues.get(handlerName);
        const config = this.queueConfigs.get(handlerName);

        if (!queueProvider || !config) {
            throw new Error(`Queue not found for handler: ${handlerName}`);
        }

        const queueName = config.name || `handler-${handlerName}`;
        const jobId = `${context.eventId}-${handlerName}-${Date.now()}`;

        const job: QueuedHandlerJob = {
            id: jobId,
            handlerName,
            eventType,
            payload,
            context: {
                ...context,
                queue: {
                    name: queueName,
                    jobId,
                    queuedAt: new Date(),
                    processing: config.processing
                }
            },
            queuedAt: new Date(),
            attempts: 0,
            priority: config.priority || 0
        };

        const delay = this.calculateDelay(config, context.attempt);

        await queueProvider.add(queueName, job, {
            jobId,
            priority: config.priority || 0,
            delay,
            attempts: config.retry?.attempts || 1
        });

        this.logger.debug(`Job ${jobId} ajouté à la queue ${queueName} pour le handler ${handlerName}`);
        return jobId;
    }

    /**
     * Traite un job de handler dans la queue
     */
    private async processHandlerJob(job: any, handler: EventHandler, config: HandlerQueueConfig): Promise<any> {
        const jobData: QueuedHandlerJob = job.data;
        const startTime = Date.now();

        this.logger.debug(`Traitement du job ${jobData.id} pour le handler ${jobData.handlerName}`);

        try {
            // Callback avant exécution
            if (handler.beforeQueue) {
                await handler.beforeQueue(jobData.eventType, jobData.payload, jobData.context);
            }

            // Exécution du handler
            const result = await handler.execute(jobData.eventType, jobData.payload, jobData.context);

            // Callback après exécution réussie
            if (handler.afterExecute) {
                await handler.afterExecute(jobData.eventType, jobData.payload, result, jobData.context);
            }

            const duration = Date.now() - startTime;
            this.logger.debug(`Job ${jobData.id} traité avec succès en ${duration}ms`);

            return {
                handlerName: jobData.handlerName,
                result,
                status: 'completed',
                duration,
                processedAt: new Date()
            };

        } catch (error) {
            // Callback en cas d'erreur
            if (handler.onError) {
                try {
                    await handler.onError(error, jobData.eventType, jobData.payload, jobData.context);
                } catch (callbackError) {
                    this.logger.error(`Erreur dans le callback onError: ${callbackError.message}`);
                }
            }

            const duration = Date.now() - startTime;
            this.logger.error(`Erreur lors du traitement du job ${jobData.id}: ${error.message} (${duration}ms)`);

            throw error; // Re-throw pour que Bull gère les tentatives
        }
    }

    /**
     * Calcule le délai pour un job selon la stratégie configurée
     */
    private calculateDelay(config: HandlerQueueConfig, attempt: number): number {
        if (!config.delay || config.processing !== 'delayed') {
            return 0;
        }

        switch (config.delay.strategy) {
            case 'exponential':
                return config.delay.ms * Math.pow(2, attempt - 1);
            case 'fixed':
            default:
                return config.delay.ms;
        }
    }

    /**
     * Obtient les statistiques d'une queue de handler
     */
    async getHandlerQueueStats(handlerName: string) {
        const queueProvider = this.handlerQueues.get(handlerName);
        if (!queueProvider) {
            return null;
        }

        // Cette méthode dépendra de l'implémentation du QueueProvider
        return await queueProvider.getStats?.();
    }

    /**
     * Vérifie la santé de toutes les queues de handlers
     */
    async checkQueuesHealth(): Promise<Record<string, boolean>> {
        const health: Record<string, boolean> = {};

        for (const [handlerName, queueProvider] of this.handlerQueues.entries()) {
            try {
                health[handlerName] = await queueProvider.isHealthy();
            } catch (error) {
                health[handlerName] = false;
            }
        }

        return health;
    }

    /**
     * Ferme toutes les queues
     */
    private async closeAllQueues() {
        const promises = Array.from(this.handlerQueues.values()).map(queue => queue.close());
        await Promise.allSettled(promises);
        this.handlerQueues.clear();
        this.queueConfigs.clear();
        this.logger.log('Toutes les queues de handlers fermées');
    }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import {
    QueuedEvent,
    NotificationResult,
    QueueConfig,
    NotificationContext
} from '../types/interfaces';
import { EventRoutingService } from './event-routing.service';

/**
 * Service de gestion des queues avec processors Bull intégrés
 */
@Injectable()
export class QueueService implements OnModuleDestroy, OnModuleInit {
    private readonly logger = new Logger(QueueService.name);
    private readonly resultCache = new Map<string, NotificationResult[]>();
    private readonly resultTTL = 300000; // 5 minutes
    private isWorkerMode = false;
    private processorRegistered = false;

    constructor(
        @InjectQueue('notifications') private readonly notificationQueue: Queue,
        private readonly routingService: EventRoutingService
    ) {
        this.setupCleanupInterval();
    }

    async onModuleInit(): Promise<void> {
        // Déterminer si on doit activer les workers
        const mode = process.env.APP_MODE || 'hybrid';
        this.isWorkerMode = mode === 'worker' || mode === 'hybrid';

        if (this.isWorkerMode) {
            await this.initializeProcessors();
        }

        this.logger.log(`Queue service initialized in ${mode} mode`);
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.notificationQueue.close();
            this.logger.log('Queue service destroyed');
        } catch (error) {
            this.logger.error('Error destroying queue service', {
                error: error.message
            });
        }
    }

    /**
     * Initialiser les processors pour traiter les jobs (méthode Bull v4 correcte)
     */
    private async initializeProcessors(): Promise<void> {
        if (this.processorRegistered) {
            return; // Éviter de registrer plusieurs fois
        }

        const concurrency = this.getConcurrency();

        this.logger.log(`🚀 Initializing notification processor with concurrency: ${concurrency}`);

        // Registrer le processor avec Bull v4 (méthode correcte)
        this.notificationQueue.process(
            'process-notification',
            concurrency,
            this.processNotificationJob.bind(this)
        );

        this.processorRegistered = true;

        // Event listeners pour monitoring
        this.setupQueueEventListeners();

        this.logger.log(`✅ Notification processor initialized with ${concurrency} concurrent workers`);
    }

    /**
     * Traiter un job de notification (processor Bull v4)
     */
    private async processNotificationJob(job: Job<QueuedEvent>): Promise<NotificationResult[]> {
        const { eventId, eventType, payload, correlationId, options } = job.data;
        const attempt = job.attemptsMade + 1;

        this.logger.debug(`Processing notification job`, {
            jobId: job.id,
            eventId,
            eventType,
            correlationId,
            attempt
        });

        try {
            // Mettre à jour le progress du job
            await job.progress(10);

            const context: NotificationContext = {
                correlationId,
                eventType,
                attempt,
                metadata: {
                    jobId: job.id,
                    queuedAt: new Date(job.timestamp),
                    startedAt: new Date(),
                    processId: process.pid,
                    ...options?.metadata
                }
            };

            // Progress à 30%
            await job.progress(30);

            // UTILISER LE SERVICE EXISTANT EventRoutingService
            const results = await this.routingService.processEvent(eventType, payload, context);

            // Progress à 80%
            await job.progress(80);

            // Stocker les résultats avec la méthode existante
            await this.storeEventResults(eventId, results);

            // Progress completed
            await job.progress(100);

            this.logger.debug(`Job processed successfully`, {
                jobId: job.id,
                eventId,
                eventType,
                resultsCount: results.length,
                successCount: results.filter(r => r.status === 'sent').length
            });

            return results;

        } catch (error) {
            this.logger.error(`Notification job processing failed`, {
                jobId: job.id,
                eventId,
                eventType,
                error: error.message,
                attempt
            });

            // Si c'est le dernier essai, stocker un résultat d'échec
            if (attempt >= (job.opts.attempts || 3)) {
                const failureResult: NotificationResult[] = [{
                    channel: 'unknown' as any,
                    provider: 'unknown',
                    status: 'failed',
                    error: error.message,
                    sentAt: new Date(),
                    attempts: attempt,
                    metadata: {
                        jobId: job.id,
                        processId: process.pid,
                        finalFailure: true
                    }
                }];

                await this.storeEventResults(eventId, failureResult);
            }

            throw error;
        }
    }

    /**
     * Configurer les event listeners pour la queue (méthode Bull v4)
     */
    private setupQueueEventListeners(): void {
        // Job started
        this.notificationQueue.on('active', (job) => {
            this.logger.debug(`Job ${job.id} started`, {
                eventType: job.data.eventType,
                eventId: job.data.eventId
            });
        });

        // Job completed successfully
        this.notificationQueue.on('completed', (job, result) => {
            this.logger.debug(`Job ${job.id} completed`, {
                eventType: job.data.eventType,
                eventId: job.data.eventId,
                resultsCount: result?.length || 0,
                duration: Date.now() - job.timestamp
            });
        });

        // Job failed
        this.notificationQueue.on('failed', (job, error) => {
            this.logger.error(`Job ${job.id} failed`, {
                eventType: job.data.eventType,
                eventId: job.data.eventId,
                error: error.message,
                attempt: job.attemptsMade
            });
        });

        // Job stalled (stuck)
        this.notificationQueue.on('stalled', (job) => {
            this.logger.warn(`Job ${job.id} stalled`, {
                eventType: job.data.eventType,
                eventId: job.data.eventId
            });
        });

        // Queue error
        this.notificationQueue.on('error', (error) => {
            this.logger.error(`Queue error:`, error);
        });

        // Queue waiting (new job added)
        this.notificationQueue.on('waiting', (jobId) => {
            this.logger.debug(`Job ${jobId} is waiting`);
        });

        // Progress updates
        this.notificationQueue.on('progress', (job, progress) => {
            this.logger.debug(`Job ${job.id} progress: ${progress}%`);
        });
    }

    /**
     * Obtenir le nombre de workers selon la configuration
     */
    private getConcurrency(): number {
        const envConcurrency = parseInt(process.env.NOTIFICATION_WORKER_CONCURRENCY || '0');

        if (envConcurrency > 0) {
            return Math.min(envConcurrency, 20); // Max 20 workers
        }

        // Calculer selon les CPU disponibles
        const cpuCount = require('os').cpus().length;
        return Math.min(Math.max(cpuCount, 2), 5); // Entre 2 et 5 par défaut
    }

    /**
     * Ajouter un job à la queue
     */
    async addJob(
        event: QueuedEvent,
        options: {
            priority?: number;
            delay?: number;
            attempts?: number;
        } = {}
    ): Promise<void> {
        try {
            await this.notificationQueue.add(
                'process-notification',
                event,
                {
                    priority: options.priority || 5,
                    delay: options.delay || 0,
                    attempts: options.attempts || 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    jobId: event.eventId // Pour éviter les doublons
                }
            );

            this.logger.debug(`Job added to queue`, {
                eventId: event.eventId,
                eventType: event.eventType,
                correlationId: event.correlationId,
                priority: options.priority,
                delay: options.delay
            });

        } catch (error) {
            this.logger.error(`Failed to add job to queue`, {
                eventId: event.eventId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Récupérer les résultats d'un événement
     */
    async getEventResults(eventId: string): Promise<NotificationResult[] | null> {
        return this.resultCache.get(eventId) || null;
    }

    /**
     * Stocker les résultats d'un événement
     */
    async storeEventResults(eventId: string, results: NotificationResult[]): Promise<void> {
        this.resultCache.set(eventId, results);

        // Programmer la suppression après TTL
        setTimeout(() => {
            this.resultCache.delete(eventId);
        }, this.resultTTL);

        this.logger.debug(`Results stored for event`, {
            eventId,
            resultCount: results.length
        });
    }


    /**
     * Obtenir les statistiques de la queue
     */
    async getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: boolean;
        processorsEnabled: boolean;
    }> {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.notificationQueue.getWaiting(),
            this.notificationQueue.getActive(),
            this.notificationQueue.getCompleted(),
            this.notificationQueue.getFailed(),
            this.notificationQueue.getDelayed()
        ]);

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            paused: await this.notificationQueue.isPaused(),
            processorsEnabled: this.isWorkerMode && this.processorRegistered
        };
    }

    /**
     * Obtenir les jobs en attente
     */
    async getWaitingJobs(limit: number = 10): Promise<Array<{
        id: string;
        eventId: string;
        eventType: string;
        createdAt: Date;
        priority: number;
    }>> {
        const jobs = await this.notificationQueue.getWaiting(0, limit - 1);

        return jobs.map(job => ({
            id: job.id!.toString(),
            eventId: job.data.eventId,
            eventType: job.data.eventType,
            createdAt: new Date(job.timestamp),
            priority: job.opts.priority || 0
        }));
    }

    /**
     * Obtenir les jobs actifs
     */
    async getActiveJobs(): Promise<Array<{
        id: string;
        eventId: string;
        eventType: string;
        startedAt: Date;
        progress: number;
    }>> {
        const jobs = await this.notificationQueue.getActive();

        return jobs.map(job => ({
            id: job.id!.toString(),
            eventId: job.data.eventId,
            eventType: job.data.eventType,
            startedAt: new Date(job.processedOn || job.timestamp),
            progress: job.progress()
        }));
    }

    /**
     * Retry d'un job échoué
     */
    async retryJob(jobId: string): Promise<boolean> {
        try {
            const job = await this.notificationQueue.getJob(jobId);
            if (job && job.isFailed()) {
                await job.retry();
                this.logger.debug(`Job retried`, { jobId });
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to retry job`, {
                jobId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Supprimer un job
     */
    async removeJob(jobId: string): Promise<boolean> {
        try {
            const job = await this.notificationQueue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.debug(`Job removed`, { jobId });
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to remove job`, {
                jobId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Nettoyer les anciens jobs
     */
    async cleanJobs(): Promise<void> {
        try {
            // Nettoyer les jobs complétés de plus de 24h
            await this.notificationQueue.clean(24 * 60 * 60 * 1000, 'completed');

            // Nettoyer les jobs échoués de plus de 7 jours
            await this.notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');

            this.logger.debug('Queue cleanup completed');
        } catch (error) {
            this.logger.error('Queue cleanup failed', {
                error: error.message
            });
        }
    }

    /**
     * Pauser la queue
     */
    async pauseQueue(): Promise<void> {
        await this.notificationQueue.pause();
        this.logger.log('Queue paused');
    }

    /**
     * Reprendre la queue
     */
    async resumeQueue(): Promise<void> {
        await this.notificationQueue.resume();
        this.logger.log('Queue resumed');
    }

    /**
     * Vérifier la santé de la queue
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Vérifier que la queue est accessible
            await this.notificationQueue.getWaiting(0, 0);
            return true;
        } catch (error) {
            this.logger.error('Queue health check failed', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Obtenir les informations sur les processors
     */
    getProcessorInfo(): {
        enabled: boolean;
        registered: boolean;
        concurrency: number;
        mode: string;
    } {
        return {
            enabled: this.isWorkerMode,
            registered: this.processorRegistered,
            concurrency: this.getConcurrency(),
            mode: process.env.APP_MODE || 'hybrid'
        };
    }

    /**
     * Configurer l'intervalle de nettoyage automatique
     */
    private setupCleanupInterval(): void {
        // Nettoyer toutes les heures
        setInterval(() => {
            this.cleanJobs();
        }, 60 * 60 * 1000);

        // Nettoyer le cache des résultats toutes les 10 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [eventId, _] of this.resultCache.entries()) {
                // Simple TTL check - dans un vrai cas, on stockerait le timestamp
                if (this.resultCache.size > 1000) { // Limite arbitraire
                    this.resultCache.delete(eventId);
                }
            }
        }, 10 * 60 * 1000);
    }

}

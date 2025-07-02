import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { QueueProvider } from '../types/interfaces';
import { QueueConfig } from '../types/interfaces';

/**
 * Bull Queue Provider (Legacy - Compatible avec @nestjs/bull)
 *
 * Provider utilisant @nestjs/bull (wrapper NestJS pour Bull legacy)
 * - Intégration native avec NestJS
 * - Support pour les projets existants utilisant Bull
 * - Compatible avec l'écosystème NestJS (decorators, injection, etc.)
 * - Recommandation : migrer vers BullMQQueueProvider pour de nouveaux projets
 */
@Injectable()
export class BullQueueProvider implements QueueProvider {
    private readonly logger = new Logger(BullQueueProvider.name);

    constructor(
        @InjectQueue('notifications') private readonly queue: Queue
    ) {}

    /**
     * Créer un BullQueueProvider avec une queue spécifique
     */
    static create(queueName: string, queue: Queue): BullQueueProvider {
        const provider = new BullQueueProvider(queue);
        return provider;
    }

    /**
     * Add a job to the queue
     */
    async add(jobName: string, data: any, options?: any): Promise<Job> {
        try {
            const jobOptions = {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: 100,
                removeOnFail: 50,
                ...options,
            };

            const job = await this.queue.add(jobName, data, jobOptions);

            this.logger.debug(`Job ${job.id} added to Bull queue with name ${jobName}`);

            return job;
        } catch (error) {
            this.logger.error(`Failed to add job ${jobName} to Bull queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process jobs from the queue
     */
    async process(
        jobName: string,
        processorOrConcurrency: number | ((job: Job) => Promise<any>),
        processor?: (job: Job) => Promise<any>
    ): Promise<void> {
        try {
            if (typeof processorOrConcurrency === 'function') {
                // process(jobName, processor)
                const processorFunction = processorOrConcurrency;

                this.queue.process(jobName, async (job: Job) => {
                    return await processorFunction(job);
                });

                this.logger.log(`Bull processor registered for job ${jobName}`);
            } else {
                // process(jobName, concurrency, processor)
                const concurrency = processorOrConcurrency;

                if (processor) {
                    this.queue.process(jobName, concurrency, async (job: Job) => {
                        return await processor(job);
                    });

                    this.logger.log(`Bull processor registered for job ${jobName} with concurrency ${concurrency}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to register Bull processor for ${jobName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if the queue is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            await this.queue.getWaiting(0, 0);
            return true;
        } catch (error) {
            this.logger.error(`Bull health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<any> {
        try {
            const [waiting, active, completed, failed] = await Promise.all([
                this.queue.getWaiting(),
                this.queue.getActive(),
                this.queue.getCompleted(),
                this.queue.getFailed(),
            ]);

            return {
                name: this.queue.name,
                type: 'Bull',
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length,
            };
        } catch (error) {
            this.logger.error(`Failed to get Bull stats: ${error.message}`);
            return {
                name: this.queue.name,
                type: 'Bull',
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                total: 0,
                error: error.message,
            };
        }
    }

    /**
     * Pause the queue
     */
    async pause(): Promise<void> {
        try {
            await this.queue.pause();
            this.logger.log(`Bull Queue ${this.queue.name} paused`);
        } catch (error) {
            this.logger.error(`Failed to pause Bull queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Resume the queue
     */
    async resume(): Promise<void> {
        try {
            await this.queue.resume();
            this.logger.log(`Bull Queue ${this.queue.name} resumed`);
        } catch (error) {
            this.logger.error(`Failed to resume Bull queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean old jobs from the queue
     */
    async clean(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            await this.queue.clean(grace, 'completed');
            await this.queue.clean(grace, 'failed');

            this.logger.log(`Cleaned old jobs from Bull queue ${this.queue.name}`);
        } catch (error) {
            this.logger.error(`Failed to clean Bull queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Close the queue connection
     */
    async close(): Promise<void> {
        try {
            if (this.queue) {
                await this.queue.close();
                this.logger.log(`Bull Queue ${this.queue.name} closed`);
            }
        } catch (error) {
            this.logger.error(`Failed to close Bull queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get the underlying queue instance
     */
    getQueue(): Queue {
        return this.queue;
    }
}
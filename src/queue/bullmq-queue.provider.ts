import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, Worker } from 'bullmq';
import { QueueProvider } from '../types/interfaces';

/**
 * BullMQ Queue Provider (Moderne - Compatible avec @nestjs/bullmq)
 * 
 * Provider utilisant @nestjs/bullmq (wrapper NestJS pour BullMQ moderne)
 * - Intégration native avec NestJS
 * - Meilleure performance et stabilité que Bull legacy
 * - Support TypeScript natif
 * - Architecture moderne avec Workers dédiés
 * - Compatible avec l'écosystème NestJS (decorators, injection, etc.)
 */
@Injectable()
export class BullMQQueueProvider implements QueueProvider {
    private readonly logger = new Logger(BullMQQueueProvider.name);
    private worker?: Worker;

    constructor(
        @InjectQueue('notifications') private readonly queue: Queue
    ) {}

    /**
     * Créer un BullMQQueueProvider avec une queue spécifique
     */
    static create(queueName: string, queue: Queue): BullMQQueueProvider {
        const provider = new BullMQQueueProvider(queue);
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
            
            this.logger.debug(`Job ${job.id} added to BullMQ queue with name ${jobName}`);
            
            return job;
        } catch (error) {
            this.logger.error(`Failed to add job ${jobName} to BullMQ queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process jobs from the queue using BullMQ Worker
     */
    async process(
        jobName: string, 
        processorOrConcurrency: number | ((job: Job) => Promise<any>), 
        processor?: (job: Job) => Promise<any>
    ): Promise<void> {
        try {
            let processorFunction: (job: Job) => Promise<any>;
            let concurrency: number;

            if (typeof processorOrConcurrency === 'function') {
                // process(jobName, processor)
                processorFunction = processorOrConcurrency;
                concurrency = 1;
            } else {
                // process(jobName, concurrency, processor)
                concurrency = processorOrConcurrency;
                processorFunction = processor!;
            }

            // Create BullMQ Worker avec la même configuration Redis que la Queue
            this.worker = new Worker(this.queue.name, async (job: Job) => {
                if (job.name === jobName) {
                    return await processorFunction(job);
                }
            }, {
                connection: this.queue.opts.connection,
                concurrency: concurrency,
            });

            // Setup worker event handlers
            this.setupWorkerEvents(jobName);

            this.logger.log(`BullMQ Worker registered for job ${jobName} with concurrency ${concurrency}`);
        } catch (error) {
            this.logger.error(`Failed to register BullMQ processor for ${jobName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Setup worker event handlers
     */
    private setupWorkerEvents(jobName: string): void {
        if (!this.worker) return;

        this.worker.on('completed', (job: Job) => {
            this.logger.debug(`BullMQ Worker completed job ${job.id} for ${jobName}`);
        });

        this.worker.on('failed', (job: Job, error: Error) => {
            this.logger.error(`BullMQ Worker failed job ${job?.id} for ${jobName}: ${error.message}`);
        });

        this.worker.on('error', (error: Error) => {
            this.logger.error(`BullMQ Worker error for ${jobName}: ${error.message}`);
        });
    }

    /**
     * Check if the queue is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            await this.queue.getWaiting(0, 0);
            return true;
        } catch (error) {
            this.logger.error(`BullMQ health check failed: ${error.message}`);
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
                type: 'BullMQ',
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length,
            };
        } catch (error) {
            this.logger.error(`Failed to get BullMQ stats: ${error.message}`);
            return {
                name: this.queue.name,
                type: 'BullMQ',
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
            this.logger.log(`BullMQ Queue ${this.queue.name} paused`);
        } catch (error) {
            this.logger.error(`Failed to pause BullMQ queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Resume the queue
     */
    async resume(): Promise<void> {
        try {
            await this.queue.resume();
            this.logger.log(`BullMQ Queue ${this.queue.name} resumed`);
        } catch (error) {
            this.logger.error(`Failed to resume BullMQ queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean old jobs from the queue
     */
    async clean(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            await this.queue.clean(grace, 10, 'completed');
            await this.queue.clean(grace, 10, 'failed');
            
            this.logger.log(`Cleaned old jobs from BullMQ queue ${this.queue.name}`);
        } catch (error) {
            this.logger.error(`Failed to clean BullMQ queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Close the queue and worker connections
     */
    async close(): Promise<void> {
        try {
            if (this.worker) {
                await this.worker.close();
                this.logger.log(`BullMQ Worker for ${this.queue.name} closed`);
            }
            
            if (this.queue) {
                await this.queue.close();
                this.logger.log(`BullMQ Queue ${this.queue.name} closed`);
            }
        } catch (error) {
            this.logger.error(`Failed to close BullMQ queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get the underlying queue instance
     */
    getQueue(): Queue {
        return this.queue;
    }

    /**
     * Get the underlying worker instance
     */
    getWorker(): Worker | undefined {
        return this.worker;
    }
}
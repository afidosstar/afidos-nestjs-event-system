import { Injectable, Logger } from '@nestjs/common';
import { QueueProvider } from '../types/interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File Queue Provider - Simple broker basé sur un fichier
 * 
 * Provider simple qui utilise le système de fichiers pour persister les jobs
 * - Aucune dépendance externe (pas de Redis)
 * - Idéal pour le développement et les environnements simples
 * - Jobs stockés dans un fichier JSON
 * - Processing en mémoire avec persistance fichier
 */
@Injectable()
export class FileQueueProvider implements QueueProvider {
    private readonly logger = new Logger(FileQueueProvider.name);
    private readonly queueFilePath: string;
    private readonly processors = new Map<string, (job: any) => Promise<any>>();
    private readonly processingIntervals = new Map<string, NodeJS.Timeout>();
    private isProcessing = false;

    constructor(queueName: string = 'default', dataDir: string = './queue-data') {
        this.queueFilePath = path.join(dataDir, `${queueName}-queue.json`);
        this.ensureDataDirectory(dataDir);
        this.logger.log(`📁 File Queue Provider initialized: ${this.queueFilePath}`);
    }

    /**
     * Assure que le répertoire de données existe
     */
    private async ensureDataDirectory(dataDir: string): Promise<void> {
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            this.logger.error(`Failed to create data directory: ${error.message}`);
        }
    }

    /**
     * Lit les jobs depuis le fichier
     */
    private async readJobs(): Promise<any[]> {
        try {
            const data = await fs.readFile(this.queueFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Fichier n'existe pas encore ou vide
            return [];
        }
    }

    /**
     * Écrit les jobs dans le fichier
     */
    private async writeJobs(jobs: any[]): Promise<void> {
        try {
            await fs.writeFile(this.queueFilePath, JSON.stringify(jobs, null, 2));
        } catch (error) {
            this.logger.error(`Failed to write jobs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add a job to the queue
     */
    async add(jobName: string, data: any, options?: any): Promise<any> {
        try {
            const job = {
                id: `file-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: jobName,
                data,
                options: options || {},
                status: 'waiting',
                createdAt: new Date().toISOString(),
                attempts: 0,
                maxAttempts: options?.attempts || 3,
            };

            const jobs = await this.readJobs();
            jobs.push(job);
            await this.writeJobs(jobs);

            this.logger.debug(`📥 Job ${job.id} added to file queue: ${jobName}`);
            return job;
        } catch (error) {
            this.logger.error(`Failed to add job ${jobName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process jobs from the queue
     */
    async process(
        jobName: string,
        processorOrConcurrency: number | ((job: any) => Promise<any>),
        processor?: (job: any) => Promise<any>
    ): Promise<void> {
        try {
            let processorFunction: (job: any) => Promise<any>;

            if (typeof processorOrConcurrency === 'function') {
                processorFunction = processorOrConcurrency;
            } else {
                processorFunction = processor!;
            }

            // Enregistrer le processor
            this.processors.set(jobName, processorFunction);
            this.logger.log(`🔄 Processor registered for job type: ${jobName}`);

            // Démarrer le traitement périodique pour ce type de job
            this.startProcessing(jobName);

        } catch (error) {
            this.logger.error(`Failed to register processor for ${jobName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Démarre le traitement périodique des jobs
     */
    private startProcessing(jobName: string): void {
        // Éviter les doublons
        if (this.processingIntervals.has(jobName)) {
            return;
        }

        const interval = setInterval(async () => {
            if (this.isProcessing) return; // Éviter les traitements concurrents

            try {
                this.isProcessing = true;
                await this.processNextJob(jobName);
            } catch (error) {
                this.logger.error(`Error processing jobs for ${jobName}: ${error.message}`);
            } finally {
                this.isProcessing = false;
            }
        }, 1000); // Vérifie toutes les secondes

        this.processingIntervals.set(jobName, interval);
        this.logger.debug(`⚡ Started processing interval for ${jobName}`);
    }

    /**
     * Traite le prochain job en attente
     */
    private async processNextJob(jobName: string): Promise<void> {
        const jobs = await this.readJobs();
        const jobIndex = jobs.findIndex(
            job => job.name === jobName && job.status === 'waiting'
        );

        if (jobIndex === -1) {
            return; // Aucun job en attente
        }

        const job = jobs[jobIndex];
        const processor = this.processors.get(jobName);

        if (!processor) {
            return; // Aucun processor enregistré
        }

        try {
            // Marquer comme actif
            job.status = 'active';
            job.attempts++;
            job.processingStartedAt = new Date().toISOString();
            await this.writeJobs(jobs);

            this.logger.log(`⚙️ Processing job ${job.id} (${jobName}) - attempt ${job.attempts}`);

            // Traiter le job
            const result = await processor(job);

            // Marquer comme complété
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date().toISOString();
            await this.writeJobs(jobs);

            this.logger.log(`✅ Job ${job.id} completed successfully`);

        } catch (error) {
            this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);

            // Gérer l'échec
            if (job.attempts >= job.maxAttempts) {
                job.status = 'failed';
                job.error = error.message;
                job.failedAt = new Date().toISOString();
            } else {
                job.status = 'waiting'; // Retry
                job.nextRetryAt = new Date(Date.now() + 5000).toISOString(); // Retry dans 5s
            }

            await this.writeJobs(jobs);
        }
    }

    /**
     * Check if the queue is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            // Tester l'accès au fichier
            await this.readJobs();
            return true;
        } catch (error) {
            this.logger.error(`Health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<any> {
        try {
            const jobs = await this.readJobs();

            const stats = {
                name: path.basename(this.queueFilePath, '.json'),
                type: 'File',
                waiting: jobs.filter(job => job.status === 'waiting').length,
                active: jobs.filter(job => job.status === 'active').length,
                completed: jobs.filter(job => job.status === 'completed').length,
                failed: jobs.filter(job => job.status === 'failed').length,
                total: jobs.length,
                filePath: this.queueFilePath,
            };

            return stats;
        } catch (error) {
            this.logger.error(`Failed to get stats: ${error.message}`);
            return {
                name: 'file-queue',
                type: 'File',
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
     * Pause the queue (stop processing)
     */
    async pause(): Promise<void> {
        for (const [jobName, interval] of this.processingIntervals) {
            clearInterval(interval);
            this.processingIntervals.delete(jobName);
            this.logger.log(`⏸️ Paused processing for ${jobName}`);
        }
    }

    /**
     * Resume the queue (restart processing)
     */
    async resume(): Promise<void> {
        for (const jobName of this.processors.keys()) {
            this.startProcessing(jobName);
        }
        this.logger.log(`▶️ Resumed queue processing`);
    }

    /**
     * Clean old completed/failed jobs
     */
    async clean(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            const jobs = await this.readJobs();
            const cutoffTime = new Date(Date.now() - maxAge);

            const cleanedJobs = jobs.filter(job => {
                if (job.status === 'waiting' || job.status === 'active') {
                    return true; // Garder les jobs actifs
                }

                const jobDate = new Date(job.completedAt || job.failedAt || job.createdAt);
                return jobDate > cutoffTime;
            });

            const removedCount = jobs.length - cleanedJobs.length;
            if (removedCount > 0) {
                await this.writeJobs(cleanedJobs);
                this.logger.log(`🧹 Cleaned ${removedCount} old jobs from file queue`);
            }
        } catch (error) {
            this.logger.error(`Failed to clean queue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Close the queue and stop all processing
     */
    async close(): Promise<void> {
        await this.pause();
        this.processors.clear();
        this.logger.log(`🔒 File Queue Provider closed`);
    }

    /**
     * Get the queue file path
     */
    getQueueFilePath(): string {
        return this.queueFilePath;
    }

    /**
     * Factory method to create FileQueueProvider
     */
    static create(queueName: string = 'default', dataDir: string = './queue-data'): FileQueueProvider {
        return new FileQueueProvider(queueName, dataDir);
    }
}
import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventLog } from '../entities/event-log.entity';

@Injectable()
@Command({
    name: 'cleanup-logs',
    description: 'Clean up old event logs to free up database space',
})
export class CleanupLogsCommand extends CommandRunner {
    private readonly logger = new Logger(CleanupLogsCommand.name);

    constructor(
        @InjectRepository(EventLog)
        private eventLogRepository: Repository<EventLog>,
    ) {
        super();
    }

    async run(passedParams: string[], options: Record<string, any>): Promise<void> {
        const daysToKeep = parseInt(options.days) || 30;
        const batchSize = parseInt(options.batchSize) || 1000;
        const dryRun = options.dryRun || false;

        this.logger.log(`Starting cleanup of logs older than ${daysToKeep} days...`);
        this.logger.log(`Batch size: ${batchSize}`);
        this.logger.log(`Dry run: ${dryRun ? 'Yes' : 'No'}`);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        try {
            // Count total logs to be deleted
            const totalCount = await this.eventLogRepository.count({
                where: {
                    createdAt: LessThan(cutoffDate),
                },
            });

            this.logger.log(`Found ${totalCount} logs to cleanup`);

            if (totalCount === 0) {
                this.logger.log('No logs to cleanup');
                return;
            }

            if (dryRun) {
                this.logger.log('Dry run mode - no logs will be deleted');

                // Show breakdown by status
                const breakdown = await this.eventLogRepository
                    .createQueryBuilder('log')
                    .select('log.status', 'status')
                    .addSelect('COUNT(*)', 'count')
                    .where('log.createdAt < :cutoffDate', { cutoffDate })
                    .groupBy('log.status')
                    .getRawMany();

                this.logger.log('Breakdown by status:');
                breakdown.forEach(item => {
                    this.logger.log(`  ${item.status}: ${item.count} logs`);
                });

                return;
            }

            // Delete in batches
            let deletedCount = 0;
            let batchNumber = 1;

            while (deletedCount < totalCount) {
                this.logger.log(`Processing batch ${batchNumber}...`);

                const logsToDelete = await this.eventLogRepository.find({
                    where: {
                        createdAt: LessThan(cutoffDate),
                    },
                    take: batchSize,
                    select: ['id'],
                });

                if (logsToDelete.length === 0) {
                    break;
                }

                const ids = logsToDelete.map(log => log.id);

                await this.eventLogRepository.delete(ids);

                deletedCount += logsToDelete.length;
                this.logger.log(`Deleted ${logsToDelete.length} logs (${deletedCount}/${totalCount})`);

                batchNumber++;

                // Small delay to avoid overwhelming the database
                await this.sleep(100);
            }

            this.logger.log(`✅ Cleanup completed! Deleted ${deletedCount} logs`);

            // Vacuum the table to reclaim space (PostgreSQL)
            try {
                await this.eventLogRepository.query('VACUUM ANALYZE event_logs');
                this.logger.log('✅ Database vacuum completed');
            } catch (error) {
                this.logger.warn('⚠️ Failed to vacuum table:', error);
            }

        } catch (error) {
            this.logger.error('❌ Cleanup failed:', error);
            process.exit(1);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    @Option({
        flags: '-d, --days <number>',
        description: 'Number of days to keep (default: 30)',
    })
    parseDays(val: string): number {
        return parseInt(val) || 30;
    }

    @Option({
        flags: '-b, --batch-size <number>',
        description: 'Batch size for deletion (default: 1000)',
    })
    parseBatchSize(val: string): number {
        return parseInt(val) || 1000;
    }

    @Option({
        flags: '--dry-run',
        description: 'Show what would be deleted without actually deleting',
    })
    parseDryRun(): boolean {
        return true;
    }
}

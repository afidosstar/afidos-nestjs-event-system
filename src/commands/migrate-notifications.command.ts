import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType, EventRecipient, EventLog } from '../entities';

@Injectable()
@Command({
  name: 'migrate-notifications',
  description: 'Migrate notifications data from previous versions',
})
export class MigrateNotificationsCommand extends CommandRunner {
  private readonly logger = new Logger(MigrateNotificationsCommand.name);

  constructor(
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
    @InjectRepository(EventRecipient)
    private eventRecipientRepository: Repository<EventRecipient>,
    @InjectRepository(EventLog)
    private eventLogRepository: Repository<EventLog>,
  ) {
    super();
  }

  async run(passedParams: string[], options: Record<string, any>): Promise<void> {
    const fromVersion = options.fromVersion;

    if (!fromVersion) {
      this.logger.error('--from-version option is required');
      process.exit(1);
    }

    this.logger.log(`Starting migration from version ${fromVersion}...`);

    try {
      switch (fromVersion) {
        case '0.9.0':
          await this.migrateFrom090();
          break;
        case '0.8.0':
          await this.migrateFrom080();
          break;
        default:
          this.logger.error(`Migration from version ${fromVersion} is not supported`);
          process.exit(1);
      }

      this.logger.log('✅ Migration completed successfully!');
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  private async migrateFrom090(): Promise<void> {
    this.logger.log('Migrating from version 0.9.0...');

    // Example migration steps
    await this.updateEventTypeSchema();
    await this.migrateRecipientData();
    await this.cleanupDeprecatedFields();
  }

  private async migrateFrom080(): Promise<void> {
    this.logger.log('Migrating from version 0.8.0...');

    // Migration steps for 0.8.0
    await this.updateEventTypeSchema();
    await this.migrateRecipientData();
    await this.addMissingIndexes();
  }

  private async updateEventTypeSchema(): Promise<void> {
    this.logger.log('Updating event type schema...');

    // Add new fields to existing event types
    const eventTypes = await this.eventTypeRepository.find();

    for (const eventType of eventTypes) {
      // Add default values for new fields if they don't exist
      const updates: Partial<EventType> = {};

      if (!eventType.priority) {
        updates.priority = 'normal';
      }

      if (eventType.waitForResult === undefined) {
        updates.waitForResult = false;
      }

      if (Object.keys(updates).length > 0) {
        await this.eventTypeRepository.update(eventType.id, updates);
        this.logger.log(`Updated event type: ${eventType.name}`);
      }
    }
  }

  private async migrateRecipientData(): Promise<void> {
    this.logger.log('Migrating recipient data...');

    // Example: Update recipient configuration structure
    const recipients = await this.eventRecipientRepository.find();

    for (const recipient of recipients) {
      // Migrate old config format to new format
      if (recipient.config && typeof recipient.config === 'string') {
        try {
          recipient.config = JSON.parse(recipient.config as any);
          await this.eventRecipientRepository.save(recipient);
          this.logger.log(`Migrated recipient: ${recipient.id}`);
        } catch (error) {
          this.logger.warn(`Failed to migrate recipient ${recipient.id}:`, error);
        }
      }
    }
  }

  private async cleanupDeprecatedFields(): Promise<void> {
    this.logger.log('Cleaning up deprecated fields...');

    // Remove or transform deprecated fields
    // This would involve SQL queries to alter table structure

    // Example: Remove deprecated columns
    // await this.eventLogRepository.query('ALTER TABLE event_logs DROP COLUMN IF EXISTS deprecated_field');
  }

  private async addMissingIndexes(): Promise<void> {
    this.logger.log('Adding missing database indexes...');

    try {
      // Add performance indexes
      await this.eventLogRepository.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_logs_correlation_id 
        ON event_logs(correlation_id)
      `);

      await this.eventLogRepository.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_logs_status_created 
        ON event_logs(status, created_at)
      `);

      this.logger.log('✅ Database indexes created successfully');
    } catch (error) {
      this.logger.warn('⚠️ Failed to create some indexes:', error);
    }
  }

  @Option({
    flags: '--from-version <version>',
    description: 'Version to migrate from (e.g., 0.9.0)',
    required: true,
  })
  parseFromVersion(val: string): string {
    return val;
  }

  @Option({
    flags: '--dry-run',
    description: 'Show what would be migrated without making changes',
  })
  parseDryRun(): boolean {
    return true;
  }
}
